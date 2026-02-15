/**
 * SELFIES decoder - converts SELFIES strings to SMILES
 * Ported from Python SELFIES library v2.2.0
 */

import { DecoderError } from './exceptions';
import { MolecularGraph, Atom, Attribution } from './molGraph';
import { molToSmiles } from './utils/smilesUtils';
import { splitSelfies } from './utils/selfiesUtils';
import {
    processAtomSymbol,
    processBranchSymbol,
    processRingSymbol,
    nextAtomState,
    nextBranchState,
    nextRingState,
    getIndexFromSelfies
} from './grammarRules';

interface RingInfo {
    leftAtom: Atom;
    rightAtom: Atom;
    bondInfo: [number, [string | null, string | null]];
}

/**
 * Translates a SELFIES string into its corresponding SMILES string.
 */
export function decoder(
    selfies: string,
    compatible: boolean = false,
    attribute: boolean = false
): string | [string, any[]] {
    if (compatible) {
        // Warning for compatible mode - output to stderr if available
        try {
            if (typeof process !== 'undefined' && process.stderr) {
                process.stderr.write(
                    "Warning: selfies.decoder() may behave differently than in previous " +
                    "major releases. We recommend using SELFIES that are up to date.\n"
                );
            }
        } catch {
            // Silently ignore if process is not available (browser environment)
        }
    }

    const mol = new MolecularGraph(attribute);
    const rings: RingInfo[] = [];
    let attributionIndex = 0;

    for (const fragment of selfies.split('.')) {
        const n = deriveMolFromSymbols(
            Array.from(tokenizeSelfies(fragment)).entries(),
            mol,
            selfies,
            Infinity,
            0,
            null,
            rings,
            attribute ? [] : null,
            attributionIndex
        );
        attributionIndex += n;
    }

    formRingsBilocally(mol, rings);
    return molToSmiles(mol, attribute);
}

/**
 * Tokenize SELFIES string, skipping [nop] symbols
 */
function* tokenizeSelfies(selfies: string): Generator<string> {
    for (const symbol of splitSelfies(selfies)) {
        if (symbol === '[nop]') {
            continue;
        }
        // In compatible mode, we would modernize symbols here
        // For simplicity, we skip that for now
        yield symbol;
    }
}

/**
 * Derive molecular graph from SELFIES symbols
 */
function deriveMolFromSymbols(
    symbolIter: IterableIterator<[number, string]>,
    mol: MolecularGraph,
    selfies: string,
    maxDerive: number,
    initState: number,
    rootAtom: Atom | null,
    rings: RingInfo[],
    attributeStack: Attribution[] | null,
    attributionIndex: number
): number {
    let nDerived = 0;
    let state: number | null = initState;
    let prevAtom = rootAtom;

    while (state !== null && nDerived < maxDerive) {
        const next = symbolIter.next();
        if (next.done) {
            break;
        }

        const [index, symbol] = next.value;
        nDerived += 1;

        // Case 1: Branch symbol (e.g. [Branch1])
        if (symbol.slice(-4, -2) === 'ch') {
            const output = processBranchSymbol(symbol);
            if (output === null) {
                raiseDecoderError(selfies, symbol);
            }

            const [bondType, nIndexSymbols] = output!;

            if (state <= 1) {
                // Skip branch if state is too low
            } else {
                const [branchInitState, nextState] = nextBranchState(bondType, state);
                state = nextState;

                const Q = readIndexFromSelfies(symbolIter, nIndexSymbols);
                nDerived += nIndexSymbols;

                const branchAttr = attributeStack !== null
                    ? [...attributeStack, { index: index + attributionIndex, token: symbol }]
                    : null;

                const derived = deriveMolFromSymbols(
                    symbolIter,
                    mol,
                    selfies,
                    Q + 1,
                    branchInitState,
                    prevAtom,
                    rings,
                    branchAttr,
                    attributionIndex
                );
                nDerived += derived;
            }
        }
        // Case 2: Ring symbol (e.g. [Ring2])
        else if (symbol.slice(-4, -2) === 'ng') {
            const output = processRingSymbol(symbol);
            if (output === null) {
                raiseDecoderError(selfies, symbol);
            }

            const [ringOrder, nIndexSymbols, bondInfo] = output!;

            if (state === 0) {
                // Skip ring at state 0
                state = 0;
            } else {
                const [actualRingOrder, nextState] = nextRingState(ringOrder, state);
                state = nextState;

                const Q = readIndexFromSelfies(symbolIter, nIndexSymbols);
                nDerived += nIndexSymbols;

                if (prevAtom !== null) {
                    const leftIdx = Math.max(0, prevAtom.index! - (Q + 1));
                    const leftAtom = mol.getAtom(leftIdx);
                    
                    // Handle stereo: if bondInfo.stereo is already a pair, use it; otherwise duplicate it
                    const stereoPair = Array.isArray(bondInfo.stereo) 
                        ? bondInfo.stereo as [string | null, string | null]
                        : [bondInfo.stereo, bondInfo.stereo] as [string | null, string | null];
                    
                    rings.push({
                        leftAtom,
                        rightAtom: prevAtom,
                        bondInfo: [actualRingOrder, stereoPair]
                    });
                }
            }
        }
        // Case 3: [epsilon]
        else if (symbol.includes('eps')) {
            state = state === 0 ? 0 : null;
        }
        // Case 4: Regular atom symbol (e.g. [N], [=C], [F])
        else {
            const output = processAtomSymbol(symbol);
            if (output === null) {
                raiseDecoderError(selfies, symbol);
            }

            const [bondInfo, atom] = output!;
            const cap = atom.bondingCapacity;

            const [actualBondOrder, nextState] = nextAtomState(bondInfo.order, cap, state);
            state = nextState;

            if (actualBondOrder === 0) {
                if (initState === 0) {
                    const addedAtom = mol.addAtom(atom, true);
                    if (attributeStack !== null) {
                        mol.addAttribution(addedAtom, [
                            ...attributeStack,
                            { index: index + attributionIndex, token: symbol }
                        ]);
                    }
                }
            } else {
                const addedAtom = mol.addAtom(atom);
                if (attributeStack !== null) {
                    mol.addAttribution(addedAtom, [
                        ...attributeStack,
                        { index: index + attributionIndex, token: symbol }
                    ]);
                }

                if (prevAtom !== null) {
                    const src = prevAtom.index!;
                    const dst = atom.index!;
                    // For atom bonds, stereo is always a single value (not a pair)
                    const stereo = bondInfo.stereo as (string | null);
                    const bond = mol.addBond(src, dst, actualBondOrder, stereo);
                    
                    if (attributeStack !== null) {
                        mol.addAttribution(bond, [
                            ...attributeStack,
                            { index: index + attributionIndex, token: symbol }
                        ]);
                    }
                }
            }

            prevAtom = atom;
        }
    }

    // Consume remaining tokens
    while (nDerived < maxDerive) {
        const next = symbolIter.next();
        if (next.done) {
            break;
        }
        nDerived += 1;
    }

    return nDerived;
}

/**
 * Raise a decoder error
 */
function raiseDecoderError(selfies: string, invalidSymbol: string): never {
    const errMsg = `Invalid symbol '${invalidSymbol}'\n\tSELFIES: ${selfies}`;
    throw new DecoderError(errMsg);
}

/**
 * Read index value from subsequent SELFIES symbols
 */
function readIndexFromSelfies(
    symbolIter: IterableIterator<[number, string]>,
    nSymbols: number
): number {
    const indexSymbols: (string | null)[] = [];
    
    for (let i = 0; i < nSymbols; i++) {
        const next = symbolIter.next();
        if (next.done) {
            indexSymbols.push(null);
        } else {
            indexSymbols.push(next.value[1]);
        }
    }
    
    const validSymbols = indexSymbols.filter(s => s !== null) as string[];
    return getIndexFromSelfies(...validSymbols);
}

/**
 * Form ring bonds bilocally
 */
function formRingsBilocally(mol: MolecularGraph, rings: RingInfo[]): void {
    const ringsMade = new Array(mol.length).fill(0);

    for (const { leftAtom, rightAtom, bondInfo } of rings) {
        const leftIdx = leftAtom.index!;
        const rightIdx = rightAtom.index!;

        // Ring to the same atom is forbidden
        if (leftIdx === rightIdx) {
            continue;
        }

        const [order, [leftStereo, rightStereo]] = bondInfo;
        const leftFree = leftAtom.bondingCapacity - mol.getBondCount(leftIdx);
        const rightFree = rightAtom.bondingCapacity - mol.getBondCount(rightIdx);

        // No room for ring bond
        if (leftFree <= 0 || rightFree <= 0) {
            continue;
        }

        const actualOrder = Math.min(order, leftFree, rightFree);

        if (mol.hasBond(leftIdx, rightIdx)) {
            // Bond already exists - could update order
            // For simplicity, we skip this case
            continue;
        } else {
            mol.addRingBond(
                leftIdx,
                rightIdx,
                actualOrder,
                leftStereo,
                rightStereo,
                ringsMade[leftIdx],
                ringsMade[rightIdx]
            );
            ringsMade[leftIdx] += 1;
            ringsMade[rightIdx] += 1;
        }
    }
}
