/**
 * Grammar rules for SELFIES symbol processing
 * Ported from Python SELFIES library v2.2.0
 */

import { ELEMENTS, INDEX_ALPHABET, INDEX_CODE, ORGANIC_SUBSET } from './constants';
import { Atom } from './molGraph';
import { BondInfo, smilesToBond } from './utils/smilesUtils';

// Caches for performance
const processAtomCache = new Map<string, [BondInfo, () => Atom] | null>();
const processBranchCache = new Map<string, [number, number] | null>();
const processRingCache = new Map<string, [number, number, BondInfo] | null>();

/**
 * Regular expression pattern for parsing atom symbols
 */
const SELFIES_ATOM_PATTERN = /^\[([=#/\\]?)(\d*)([A-Z][a-z]?)([@]{0,2})((?:[H]\d)?)((?:[+-][1-9]+)?)\]$/;

/**
 * Process an atom SELFIES symbol
 */
export function processAtomSymbol(symbol: string): [BondInfo, Atom] | null {
    const cached = processAtomCache.get(symbol);
    if (cached !== undefined) {
        if (cached === null) return null;
        const [bondInfo, atomFactory] = cached;
        return [bondInfo, atomFactory()];
    }

    const result = processAtomSelfiesNoCache(symbol);
    if (result === null) {
        processAtomCache.set(symbol, null);
        return null;
    }

    const [bondInfo, atomFactory] = result;
    processAtomCache.set(symbol, [bondInfo, atomFactory]);
    return [bondInfo, atomFactory()];
}

function processAtomSelfiesNoCache(symbol: string): [BondInfo, () => Atom] | null {
    const match = symbol.match(SELFIES_ATOM_PATTERN);
    if (!match) {
        return null;
    }

    const [, bondChar, isotope, element, chirality, hCount, charge] = match;

    // Check if it's an organic subset atom (simpler case)
    const innerContent = symbol.substring(1 + bondChar.length, symbol.length - 1);
    if (ORGANIC_SUBSET.has(innerContent)) {
        const atomFactory = () => new Atom(element, false);
        return [smilesToBond(bondChar), atomFactory];
    }

    const isotopeNum = isotope === '' ? null : parseInt(isotope);
    
    if (!ELEMENTS.has(element)) {
        return null;
    }

    const chiralityStr = chirality === '' ? null : chirality;

    let hCountNum: number;
    if (hCount === '') {
        hCountNum = 0;
    } else {
        hCountNum = parseInt(hCount.substring(1));
    }

    let chargeNum: number;
    if (charge === '') {
        chargeNum = 0;
    } else {
        chargeNum = parseInt(charge.substring(1));
        chargeNum *= charge[0] === '+' ? 1 : -1;
    }

    const atomFactory = () => new Atom(
        element,
        false,
        isotopeNum,
        chiralityStr,
        hCountNum,
        chargeNum
    );

    const atom = atomFactory();
    if (atom.bondingCapacity < 0) {
        return null; // too many Hs
    }

    return [smilesToBond(bondChar), atomFactory];
}

/**
 * Process a branch SELFIES symbol
 */
export function processBranchSymbol(symbol: string): [number, number] | null {
    const cached = processBranchCache.get(symbol);
    if (cached !== undefined) {
        return cached;
    }

    const result = processBranchSelfiesNoCache(symbol);
    processBranchCache.set(symbol, result);
    return result;
}

function processBranchSelfiesNoCache(symbol: string): [number, number] | null {
    // Match patterns like [Branch1], [=Branch1], [#Branch1], [Branch2], etc.
    const branchMatch = symbol.match(/^\[([=#]?)Branch([123])\]$/);
    if (!branchMatch) {
        return null;
    }

    const [, bondChar, branchNum] = branchMatch;
    const branchType = parseInt(branchNum);
    
    let bondOrder: number;
    if (bondChar === '') {
        bondOrder = 1;
    } else if (bondChar === '=') {
        bondOrder = 2;
    } else if (bondChar === '#') {
        bondOrder = 3;
    } else {
        return null;
    }

    // Return [bondOrder, branchType] to match Python implementation
    // where first value is bond order and second is number of index symbols
    return [bondOrder, branchType];
}

/**
 * Process a ring SELFIES symbol
 */
export function processRingSymbol(symbol: string): [number, number, BondInfo] | null {
    const cached = processRingCache.get(symbol);
    if (cached !== undefined) {
        return cached;
    }

    const result = processRingSelfiesNoCache(symbol);
    processRingCache.set(symbol, result);
    return result;
}

function processRingSelfiesNoCache(symbol: string): [number, number, BondInfo] | null {
    // Match patterns like:
    // - [Ring1], [=Ring1], [#Ring1] (simple bonds)
    // - [\-Ring1], [/-Ring1], [\/Ring1], etc. (stereo bonds - two chars)
    let ringMatch = symbol.match(/^\[([=#]?)Ring([123])\]$/);
    if (ringMatch) {
        // Simple bond pattern
        const [, bondChar, ringNum] = ringMatch;
        const ringType = parseInt(ringNum);
        const bondInfo = smilesToBond(bondChar);
        return [bondInfo.order, ringType, bondInfo];
    }
    
    // Try stereo bond pattern (two characters from -, /, \)
    ringMatch = symbol.match(/^\[([-/\\])([-/\\])Ring([123])\]$/);
    if (ringMatch) {
        const [, lchar, rchar, ringNum] = ringMatch;
        // Skip if both are '-' (invalid pattern)
        if (lchar === '-' && rchar === '-') {
            return null;
        }
        const ringType = parseInt(ringNum);
        const lbond = smilesToBond(lchar);
        const rbond = smilesToBond(rchar);
        // Return bond with stereo pair (lstereo, rstereo)
        const stereoPair = [lbond.stereo, rbond.stereo] as [string | null, string | null];
        return [lbond.order, ringType, { order: lbond.order, stereo: stereoPair }];
    }
    
    return null;
}

/**
 * Calculate next state after placing an atom
 */
export function nextAtomState(
    bondOrder: number,
    bondCap: number,
    state: number
): [number, number | null] {
    if (state === 0) {
        bondOrder = 0;
    }

    bondOrder = Math.min(bondOrder, state, bondCap);
    const bondsLeft = bondCap - bondOrder;
    const nextState = bondsLeft === 0 ? null : bondsLeft;
    
    return [bondOrder, nextState];
}

/**
 * Calculate next state after processing a branch
 */
export function nextBranchState(
    branchType: number,
    state: number
): [number, number | null] {
    if (branchType < 1 || branchType > 3) {
        throw new Error('Branch type must be between 1 and 3');
    }
    if (state <= 1) {
        throw new Error('State must be greater than 1');
    }

    const branchInitState = Math.min(state - 1, branchType);
    const nextState = state - branchInitState;
    
    return [branchInitState, nextState];
}

/**
 * Calculate next state after processing a ring
 */
export function nextRingState(
    ringType: number,
    state: number
): [number, number | null] {
    if (state <= 0) {
        throw new Error('State must be greater than 0');
    }

    const bondOrder = Math.min(ringType, state);
    const bondsLeft = state - bondOrder;
    const nextState = bondsLeft === 0 ? null : bondsLeft;
    
    return [bondOrder, nextState];
}

/**
 * Get index from SELFIES symbols (for Ring/Branch references)
 */
export function getIndexFromSelfies(...symbols: string[]): number {
    if (symbols.length === 0) {
        return 0; // Early return if no symbols
    }
    let index = 0;
    const base = INDEX_ALPHABET.length;
    
    for (let i = 0; i < symbols.length; i++) {
        const symbol = symbols[symbols.length - 1 - i];
        const code = INDEX_CODE[symbol];
        index += (code || 0) * Math.pow(base, i);
    }
    
    return index;
}

/**
 * Get SELFIES symbols from index (for Ring/Branch references)
 */
export function getSelfiesFromIndex(index: number): string[] {
    if (index < 0) {
        throw new Error('Index must be non-negative');
    }
    
    if (index === 0) {
        return [INDEX_ALPHABET[0]];
    }

    const symbols: string[] = [];
    const base = INDEX_ALPHABET.length;
    let remaining = index;
    
    while (remaining > 0) {
        symbols.unshift(INDEX_ALPHABET[remaining % base]);
        remaining = Math.floor(remaining / base);
    }
    
    return symbols;
}
