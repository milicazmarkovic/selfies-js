/**
 * SELFIES encoder - converts SMILES strings to SELFIES
 * Ported from Python SELFIES library v2.2.0
 */

import { EncoderError } from './exceptions';
import { smilesToMol, SMILESParserError } from './utils/smilesParser';
import { MolecularGraph, Atom, DirectedBond, AttributionMap } from './molGraph';
import { atomToSmiles } from './utils/smilesUtils';
import { bondToSmiles } from './utils/smilesUtils';
import { getSelfiesFromIndex } from './grammarRules';

/**
 * Translates a SMILES string into its corresponding SELFIES string.
 * 
 * This translation is deterministic and does not depend on the current
 * semantic constraints. Additionally, it preserves the atom order of 
 * the input SMILES string.
 * 
 * @param smiles - The SMILES string to be translated
 * @param strict - If true, will check semantic constraints (default: true)
 * @param attribute - If true, returns attribution information (default: false)
 * @returns SELFIES string, or [SELFIES, attribution] if attribute=true
 */
export function encoder(
    smiles: string,
    strict: boolean = true,
    attribute: boolean = false
): string | [string, AttributionMap[]] {
    try {
        // Parse SMILES to molecular graph
        const mol = smilesToMol(smiles, attribute);

        // Kekulize aromatic bonds
        if (!mol.kekulize()) {
            throw new EncoderError(`kekulization failed\n\tSMILES: ${smiles}`);
        }

        // Check bond constraints if strict mode
        if (strict) {
            checkBondConstraints(mol, smiles);
        }

        // Invert chirality where necessary for proper round-trip
        for (const atom of mol.getAtoms()) {
            if (atom.chirality !== null && 
                mol.hasOutRingBond(atom.index!) && 
                shouldInvertChirality(mol, atom)) {
                atom.invertChirality();
            }
        }

        // Convert each fragment to SELFIES
        const fragments: string[] = [];
        const attributionMaps: AttributionMap[] = [];
        let attributionIndex = 0;

        for (const root of mol.getRoots()) {
            const derived = Array.from(fragmentToSelfies(mol, null, root, attributionMaps, attributionIndex));
            attributionIndex += derived.length;
            fragments.push(derived.join(''));
        }

        // Trim attribution map of empty tokens
        const trimmedMaps = attributionMaps.filter(a => a.token);

        const result = fragments.join('.');
        return attribute ? [result, trimmedMaps] : result;

    } catch (error) {
        if (error instanceof SMILESParserError) {
            throw new EncoderError(`failed to parse input\n\tSMILES: ${smiles}\n\t${error.message}`);
        }
        throw error;
    }
}

/**
 * Check bond constraints for strict mode
 */
function checkBondConstraints(mol: MolecularGraph, smiles: string): void {
    const errors: [string, number, number][] = [];

    for (const atom of mol.getAtoms()) {
        const bondCap = atom.bondingCapacity;
        const bondCount = mol.getBondCount(atom.index!);
        if (bondCount > bondCap) {
            errors.push([atomToSmiles(atom), bondCount, bondCap]);
        }
    }

    if (errors.length > 0) {
        let errMsg = `input violates the currently-set semantic constraints\n\tSMILES: ${smiles}\n\tErrors:\n`;
        for (const [atomStr, count, cap] of errors) {
            errMsg += `\t[${atomStr} with ${count} bond(s) - a max. of ${cap} bond(s) was specified]\n`;
        }
        throw new EncoderError(errMsg);
    }
}

/**
 * Determine if chirality should be inverted for proper round-trip encoding
 */
function shouldInvertChirality(mol: MolecularGraph, atom: Atom): boolean {
    const outBonds = mol.getOutDirBonds(atom.index!);

    // Partition bonds into three categories:
    // 1. rings whose right number are bonded to this atom (e.g. ...1...X1)
    // 2. rings whose left number are bonded to this atom (e.g. X1...1...)
    // 3. branches and other (e.g. X(...)...)
    const partition: number[][] = [[], [], []];
    
    for (let i = 0; i < outBonds.length; i++) {
        const bond = outBonds[i];
        if (!bond.ringBond) {
            partition[2].push(i);
        } else if (bond.src < bond.dst) {
            partition[1].push(i);
        } else {
            partition[0].push(i);
        }
    }

    // Sort partition[1] by destination
    partition[1].sort((a, b) => outBonds[a].dst - outBonds[b].dst);

    // Construct permutation
    const perm = [...partition[0], ...partition[1], ...partition[2]];

    // Count inversions
    let count = 0;
    for (let i = 0; i < perm.length; i++) {
        for (let j = i + 1; j < perm.length; j++) {
            if (perm[i] > perm[j]) {
                count++;
            }
        }
    }

    return count % 2 !== 0; // if odd permutation, should invert chirality
}

/**
 * Convert a molecular fragment to SELFIES representation
 */
function* fragmentToSelfies(
    mol: MolecularGraph,
    bondIntoRoot: DirectedBond | null,
    root: number,
    attributionMaps: AttributionMap[],
    attributionIndex: number = 0
): Generator<string> {
    const derived: string[] = [];

    let bondIntoCurr = bondIntoRoot;
    let curr = root;

    while (true) {
        const currAtom = mol.getAtom(curr);
        const token = atomToSelfies(bondIntoCurr, currAtom);
        derived.push(token);

        attributionMaps.push({
            index: derived.length - 1 + attributionIndex,
            token,
            attribution: mol.getAttribution(currAtom) || []
        });

        const outBonds = mol.getOutDirBonds(curr);
        
        for (let i = 0; i < outBonds.length; i++) {
            const bond = outBonds[i];

            if (bond.ringBond) {
                if (bond.src < bond.dst) {
                    continue; // Skip left ring bonds
                }

                const revBond = mol.getDirBond(bond.dst, bond.src);
                const ringLen = bond.src - bond.dst;
                const QAsSymbols = getSelfiesFromIndex(ringLen - 1);
                const ringSymbol = `[${ringBondsToSelfies(revBond, bond)}Ring${QAsSymbols.length}]`;

                derived.push(ringSymbol);
                attributionMaps.push({
                    index: derived.length - 1 + attributionIndex,
                    token: ringSymbol,
                    attribution: mol.getAttribution(bond) || []
                });

                for (const symbol of QAsSymbols) {
                    derived.push(symbol);
                    attributionMaps.push({
                        index: derived.length - 1 + attributionIndex,
                        token: symbol,
                        attribution: mol.getAttribution(bond) || []
                    });
                }

            } else if (i === outBonds.length - 1) {
                // Last bond - continue on main chain
                bondIntoCurr = bond;
                curr = bond.dst;

            } else {
                // Branch
                const start = attributionMaps.length;
                const branch = Array.from(fragmentToSelfies(
                    mol, bond, bond.dst, attributionMaps, derived.length
                ));
                const QAsSymbols = getSelfiesFromIndex(branch.length - 1);
                const branchSymbol = `[${bondToSelfies(bond.order, bond.stereo, false)}Branch${QAsSymbols.length}]`;
                const end = attributionMaps.length;

                derived.push(branchSymbol);
                for (const symbol of QAsSymbols) {
                    derived.push(symbol);
                    attributionMaps.push({
                        index: derived.length - 1 + attributionIndex,
                        token: symbol,
                        attribution: mol.getAttribution(bond) || []
                    });
                }

                // Account for branch symbol because it is inserted after
                for (let j = start; j < end; j++) {
                    attributionMaps[j].index += QAsSymbols.length + 1;
                }

                attributionMaps.push({
                    index: derived.length - 1 + attributionIndex,
                    token: branchSymbol,
                    attribution: mol.getAttribution(bond) || []
                });

                derived.push(...branch);
            }
        }

        // End of chain
        if (outBonds.length === 0 || outBonds[outBonds.length - 1].ringBond) {
            break;
        }
    }

    yield* derived;
}

/**
 * Convert bond to SELFIES representation
 */
function bondToSelfies(order: number, stereo: string | null, showStereo: boolean = true): string {
    if (!showStereo && order === 1) {
        return '';
    }
    return bondToSmiles(order, stereo);
}

/**
 * Convert ring bonds to SELFIES representation
 */
function ringBondsToSelfies(lbond: DirectedBond, rbond: DirectedBond): string {
    if (lbond.order !== 1 || (lbond.stereo === null && rbond.stereo === null)) {
        return bondToSelfies(lbond.order, lbond.stereo, false);
    } else {
        const lchar = lbond.stereo === null ? '-' : lbond.stereo;
        const rchar = rbond.stereo === null ? '-' : rbond.stereo;
        // Sort stereo characters to match Python SELFIES order: - < / < \
        const chars = [lchar, rchar].sort();
        return chars[0] + chars[1];
    }
}

/**
 * Convert atom to SELFIES representation
 */
function atomToSelfies(bond: DirectedBond | null, atom: Atom): string {
    const bondChar = bond === null ? '' : bondToSelfies(bond.order, bond.stereo);
    const atomStr = atomToSmiles(atom).replace(/^\[|\]$/g, ''); // Remove brackets
    return `[${bondChar}${atomStr}]`;
}
