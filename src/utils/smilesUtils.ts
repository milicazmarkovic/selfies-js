/**
 * SMILES utility functions for parsing and generating SMILES strings
 * Ported from Python SELFIES library v2.2.0
 */

import { Atom, MolecularGraph } from '../molGraph';
import { ORGANIC_SUBSET } from '../constants';

export interface BondInfo {
    order: number;
    stereo: string | null | [string | null, string | null];  // Single stereo or pair for ring bonds
}

/**
 * Convert bond character to bond info
 */
export function smilesToBond(bondChar: string): BondInfo {
    switch (bondChar) {
        case '':
        case '-':
            return { order: 1, stereo: null };
        case '=':
            return { order: 2, stereo: null };
        case '#':
            return { order: 3, stereo: null };
        case '/':
            return { order: 1, stereo: '/' };
        case '\\':
            return { order: 1, stereo: '\\' };
        default:
            return { order: 1, stereo: null };
    }
}

/**
 * Convert bond info to SMILES bond character
 */
export function bondToSmiles(order: number, stereo: string | null): string {
    if (stereo) {
        return stereo;
    }
    
    switch (order) {
        case 1:
            return '';
        case 2:
            return '=';
        case 3:
            return '#';
        case 1.5:
            return ':';
        default:
            return '';
    }
}

/**
 * Convert atom to SMILES representation
 */
export function atomToSmiles(atom: Atom): string {
    const { element, isAromatic, isotope, chirality, hCount, charge } = atom;

    // Simple organic subset atoms
    if (!isAromatic && charge === 0 && hCount === null && isotope === null && chirality === null) {
        if (ORGANIC_SUBSET.has(element)) {
            return element;
        }
    }

    // Aromatic atoms
    if (isAromatic) {
        return element.toLowerCase();
    }

    // Bracketed atoms
    let result = '[';
    
    if (isotope !== null) {
        result += isotope;
    }
    
    result += element;
    
    if (chirality) {
        result += chirality;
    }
    
    // Match Python: output H count if non-zero, or if all specs are default and organic subset
    if (hCount !== null && hCount !== 0) {
        result += 'H';
        result += hCount;  // H1, H2, etc.
   } else if ((isotope === null && chirality === null && hCount === 0 && charge === 0) && 
               ORGANIC_SUBSET.has(element)) {
        // Add H0 for organic subset atoms with all default specs and h_count=0
        // This matches Python's behavior for atoms like [N] in [N]=O
        result += 'H0';
    }
    
    if (charge !== 0) {
        if (charge > 0) {
            result += '+';
            result += charge;  // Always append charge (matches Python)
        } else {
            result += '-';
            result += Math.abs(charge);  // Always append charge (matches Python)
        }
    }
    
    result += ']';
    return result;
}

/**
 * Convert molecular graph to SMILES string
 */
export function molToSmiles(
    mol: MolecularGraph,
    attribute: boolean = false
): string | [string, any[]] {
    const fragments: string[] = [];
    const attributionMaps: any[] = [];
    const ringLog: Map<string, number> = new Map();

    for (const rootIdx of mol.getRoots()) {
        const derived: string[] = [];
        deriveSmilesFromFragment(derived, mol, rootIdx, ringLog, attributionMaps, 0);
        fragments.push(derived.join(''));
    }

    const result = fragments.join('.');
    return attribute ? [result, attributionMaps] : result;
}

/**
 * Stack-based SMILES generation from a molecular fragment
 * Follows the Python implementation's iterative approach
 */
function deriveSmilesFromFragment(
    derived: string[],
    mol: MolecularGraph,
    root: number,
    ringLog: Map<string, number>,
    _attributionMaps: any[],
    _attributionIndex: number = 0
): void {
    // Stack entries: [currentAtomIdx, bondIndex, totalBonds, needsClosing]
    const stack: Array<[number, number, number, boolean]> = [];
    
    const outBonds = mol.getOutDirBonds(root);
    stack.push([root, 0, outBonds.length, false]);

    while (stack.length > 0) {
        const [curr, bondIndex, totalBonds, needsClosing] = stack[stack.length - 1];
        const currAtom = mol.getAtom(curr);

        // First time visiting this atom - add atom symbol
        if (bondIndex === 0) {
            const token = atomToSmiles(currAtom);
            derived.push(token);
        }

        const currOutBonds = mol.getOutDirBonds(curr);

        if (bondIndex < totalBonds) {
            const bond = currOutBonds[bondIndex];
            
            // Update stack entry for next bond
            stack[stack.length - 1] = [curr, bondIndex + 1, totalBonds, needsClosing];

            if (bond.ringBond) {
                // Ring bond - add bond symbol and ring number
                const bondToken = bondToSmiles(bond.order, bond.stereo);
                derived.push(bondToken);
                
                const ends = `${Math.min(bond.src, bond.dst)},${Math.max(bond.src, bond.dst)}`;
                let rnum = ringLog.get(ends);
                if (rnum === undefined) {
                    rnum = ringLog.size + 1;
                    ringLog.set(ends, rnum);
                }
                
                if (rnum >= 10) {
                    derived.push('%');
                }
                derived.push(rnum.toString());
            } else {
                // Non-ring bond - traverse to destination atom
                if (bondIndex < totalBonds - 1) {
                    derived.push('(');
                }

                const bondToken = bondToSmiles(bond.order, bond.stereo);
                derived.push(bondToken);
                
                const dstOutBonds = mol.getOutDirBonds(bond.dst);
                stack.push([bond.dst, 0, dstOutBonds.length, bondIndex < totalBonds - 1]);
            }
        } else {
            // Finished processing all bonds from this atom
            stack.pop();
            if (needsClosing) {
                derived.push(')');
            }
        }
    }
}

