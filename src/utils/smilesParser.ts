/**
 * SMILES parsing utilities - tokenization and conversion to molecular graph
 * Ported from Python SELFIES library v2.2.0
 */

import { Atom, MolecularGraph } from '../molGraph';
import { AROMATIC_SUBSET, ORGANIC_SUBSET, ELEMENTS } from '../constants';

export class SMILESParserError extends Error {
    constructor(smiles: string, message: string, position: number) {
        super(`SMILES parsing error at position ${position}: ${message}\n\tSMILES: ${smiles}`);
        this.name = 'SMILESParserError';
    }
}

const SMILES_BRACKETED_ATOM_PATTERN = /^\[(\d*)([A-Za-z][a-z]?)([@]{0,2})((?:[H]\d?)?)((?:[+]+|[-]+|[+-]\d+)?)((?:[:]\d+)?)\]$/;

const SMILES_BOND_ORDERS: { [key: string]: number } = {
    "-": 1,
    "/": 1,
    "\\": 1,
    ":": 1.5,
    "=": 2,
    "#": 3
};

const SMILES_STEREO_BONDS = new Set(["/", "\\"]);

enum SMILESTokenType {
    ATOM = 'ATOM',
    BRANCH = 'BRANCH',
    RING = 'RING',
    DOT = 'DOT'
}

class SMILESToken {
    bondIdx: number | null;
    startIdx: number;
    endIdx: number;
    tokenType: SMILESTokenType;
    token: string;

    constructor(
        bondIdx: number | null,
        startIdx: number,
        endIdx: number,
        tokenType: SMILESTokenType,
        token: string
    ) {
        this.bondIdx = bondIdx;
        this.startIdx = startIdx;
        this.endIdx = endIdx;
        this.tokenType = tokenType;
        this.token = token;
    }

    extractBondChar(smiles: string): string | null {
        return this.bondIdx === null ? null : smiles[this.bondIdx];
    }

    extractSymbol(smiles: string): string {
        return smiles.substring(this.startIdx, this.endIdx);
    }

    toString(): string {
        return this.token;
    }
}

/**
 * Tokenize a SMILES string into individual tokens
 */
function* tokenizeSmiles(smiles: string): Generator<SMILESToken> {
    let i = 0;

    while (i < smiles.length) {
        if (smiles[i] === '.') {
            yield new SMILESToken(null, i, i + 1, SMILESTokenType.DOT, smiles[i]);
            i++;
            continue;
        }

        let bondIdx: number | null = null;
        if (Object.prototype.hasOwnProperty.call(SMILES_BOND_ORDERS, smiles[i])) {
            bondIdx = i;
            i++;
        }

        if (i === smiles.length) {
            throw new SMILESParserError(smiles, 'hanging bond', i - 1);
        }

        let token: SMILESToken;

        if (/[A-Za-z]/.test(smiles[i])) {
            // Organic subset elements
            if (smiles.substring(i, i + 2) === 'Br' || smiles.substring(i, i + 2) === 'Cl') {
                token = new SMILESToken(bondIdx, i, i + 2, SMILESTokenType.ATOM, smiles.substring(i, i + 2));
            } else {
                token = new SMILESToken(bondIdx, i, i + 1, SMILESTokenType.ATOM, smiles.substring(i, i + 1));
            }
        } else if (smiles[i] === '[') {
            // Bracketed atoms
            const rIdx = smiles.indexOf(']', i + 1);
            if (rIdx === -1) {
                throw new SMILESParserError(smiles, 'hanging bracket [', i);
            }
            token = new SMILESToken(bondIdx, i, rIdx + 1, SMILESTokenType.ATOM, smiles.substring(i, rIdx + 1));
        } else if (smiles[i] === '(' || smiles[i] === ')') {
            // Branch brackets
            if (bondIdx !== null) {
                throw new SMILESParserError(smiles, 'hanging bond', bondIdx);
            }
            token = new SMILESToken(null, i, i + 1, SMILESTokenType.BRANCH, smiles[i]);
        } else if (/\d/.test(smiles[i])) {
            // One-digit ring number
            token = new SMILESToken(bondIdx, i, i + 1, SMILESTokenType.RING, smiles[i]);
        } else if (smiles[i] === '%') {
            // Two-digit ring number
            const rnum = smiles.substring(i + 1, i + 3);
            if (!/^\d{2}$/.test(rnum)) {
                throw new SMILESParserError(smiles, `invalid ring number '%${rnum}'`, i);
            }
            token = new SMILESToken(bondIdx, i, i + 3, SMILESTokenType.RING, smiles.substring(i, i + 3));
        } else {
            throw new SMILESParserError(smiles, `unrecognized symbol '${smiles[i]}'`, i);
        }

        yield token;
        i = token.endIdx;
    }
}

/**
 * Parse an atom symbol from SMILES to an Atom object
 */
export function smilesToAtom(atomSymbol: string): Atom | null {
    if (atomSymbol[0] === '[' && atomSymbol[atomSymbol.length - 1] === ']') {
        // Bracketed atom - parse with regex
        const match = atomSymbol.match(SMILES_BRACKETED_ATOM_PATTERN);
        if (!match) {
            return null;
        }

        const [, isotopeStr, element, chirality, hCountStr, chargeStr] = match;

        const isotope = isotopeStr === '' ? null : parseInt(isotopeStr);
        const isAromatic = element.toLowerCase() === element && AROMATIC_SUBSET.has(element.toLowerCase());
        const elementCap = element.charAt(0).toUpperCase() + element.slice(1).toLowerCase();
        
        if (!ELEMENTS.has(elementCap)) {
            return null;
        }

        const chiralTag = chirality === '' ? null : chirality;

        let hCount: number;
        if (hCountStr === '') {
            hCount = 0;  // Bracketed atoms without H spec have h_count=0 (matches Python)
        } else {
            const hStr = hCountStr.substring(1); // Remove 'H'
            hCount = hStr === '' ? 1 : parseInt(hStr);  // H, H0, H1, H2, etc.
        }

        let charge: number;
        if (chargeStr === '') {
            charge = 0;
        } else {
            if (/\d/.test(chargeStr[chargeStr.length - 1])) {
                // Format: +2 or -1
                charge = parseInt(chargeStr);
            } else {
                // Format: ++ or ---
                charge = chargeStr.length;
                if (chargeStr[0] === '-') charge = -charge;
            }
        }

        return new Atom(elementCap, isAromatic, isotope, chiralTag, hCount, charge);
    } else if (ORGANIC_SUBSET.has(atomSymbol)) {
        // Organic subset element (uppercase)
        return new Atom(atomSymbol, false);
    } else if (AROMATIC_SUBSET.has(atomSymbol)) {
        // Aromatic element (lowercase)
        return new Atom(atomSymbol.toUpperCase(), true);
    }

    return null;
}

/**
 * Parse a bond character to get order and stereo info
 */
export function smilesToBond(bondChar: string | null): [number, string | null] {
    const order = bondChar && Object.prototype.hasOwnProperty.call(SMILES_BOND_ORDERS, bondChar)
        ? SMILES_BOND_ORDERS[bondChar] 
        : 1;
    const stereo = bondChar && SMILES_STEREO_BONDS.has(bondChar) ? bondChar : null;
    return [order, stereo];
}

/**
 * Convert a SMILES string to a molecular graph
 */
export function smilesToMol(smiles: string, attributable: boolean = false): MolecularGraph {
    if (smiles === '') {
        throw new SMILESParserError(smiles, 'empty SMILES', 0);
    }

    const mol = new MolecularGraph(attributable);
    const tokens: SMILESToken[] = Array.from(tokenizeSmiles(smiles));
    let i = 0;

    while (tokens.length > 0) {
        i = deriveMolFromTokens(mol, smiles, tokens, i);
    }

    return mol;
}

/**
 * Parse tokens into molecule graph
 */
function deriveMolFromTokens(
    mol: MolecularGraph,
    smiles: string,
    tokens: SMILESToken[],
    i: number
): number {
    let tok: SMILESToken | null = null;
    const prevStack: (Atom | null)[] = [null]; // Keep track of previous atom on current chain
    const branchStack: SMILESToken[] = []; // Keep track of open branches
    const ringLog = new Map<string, [SMILESToken, Atom, number]>(); // Keep track of hanging ring numbers
    let chainStart = true;

    while (tokens.length > 0) {
        tok = tokens.shift()!;
        const bondChar = tok.extractBondChar(smiles);
        const symbol = tok.extractSymbol(smiles);
        const symbolType = tok.tokenType;
        const prevAtom = prevStack[prevStack.length - 1];

        if (symbolType === SMILESTokenType.DOT) {
            break;
        } else if (symbolType === SMILESTokenType.ATOM) {
            const curr = smilesToAtom(symbol);
            if (curr === null) {
                throw new SMILESParserError(smiles, `invalid atom symbol '${symbol}'`, tok.startIdx);
            }

            const result = attachAtom(mol, bondChar, curr, prevAtom, i, tok);
            i = result[1];
            prevStack.pop();
            prevStack.push(result[0]);
            chainStart = false;
        } else if (chainStart) {
            throw new SMILESParserError(smiles, 'SMILES chain begins with non-atom', tok.startIdx);
        } else if (symbolType === SMILESTokenType.BRANCH) {
            if (symbol === '(') {
                branchStack.push(tok);
                prevStack.push(prevAtom);
                chainStart = true;
            } else {
                if (branchStack.length === 0) {
                    throw new SMILESParserError(smiles, "hanging ')' bracket", tok.startIdx);
                }
                branchStack.pop();
                prevStack.pop();
            }
        } else if (symbolType === SMILESTokenType.RING) {
            if (!ringLog.has(symbol)) {
                const lpos = mol.addPlaceholderBond(prevAtom!.index!);
                ringLog.set(symbol, [tok, prevAtom!, lpos]);
            } else {
                const [ltoken, latom, lpos] = ringLog.get(symbol)!;
                ringLog.delete(symbol);
                makeRingBonds(mol, smiles, ltoken, latom, lpos, tok, prevAtom!);
            }
        } else {
            throw new Error('invalid symbol type');
        }
        i++;
    }

    if (mol.length === 0) {
        const errIdx = (tok === null ? smiles.length : tok.startIdx) - 1;
        throw new SMILESParserError(smiles, 'empty SMILES fragment', errIdx);
    }

    if (branchStack.length > 0) {
        const errIdx = branchStack[branchStack.length - 1].startIdx;
        throw new SMILESParserError(smiles, "hanging '(' bracket", errIdx);
    }

    if (ringLog.size > 0) {
        const [rnum, [tok]] = Array.from(ringLog.entries())[ringLog.size - 1];
        throw new SMILESParserError(smiles, `hanging ring number '${rnum}'`, tok.startIdx);
    }

    return i;
}

/**
 * Attach an atom to the molecular graph
 */
function attachAtom(
    mol: MolecularGraph,
    bondChar: string | null,
    atom: Atom,
    prevAtom: Atom | null,
    i: number,
    tok: SMILESToken
): [Atom, number] {
    const isRoot = prevAtom === null;
    if (bondChar) {
        i++;
    }

    const addedAtom = mol.addAtom(atom, isRoot);
    mol.addAttribution(addedAtom, [{ index: i, token: tok.toString() }]);

    if (!isRoot) {
        const src = prevAtom!.index!;
        const dst = atom.index!;
        let order: number;
        let stereo: string | null;
        [order, stereo] = smilesToBond(bondChar);

        // Handle implicit aromatic bonds
        if (prevAtom!.isAromatic && atom.isAromatic && bondChar === null) {
            order = 1.5;
        }

        const bond = mol.addBond(src, dst, order, stereo);
        mol.addAttribution(bond, [{ index: i, token: tok.toString() }]);
    }

    return [atom, i];
}

/**
 * Create ring bonds between two atoms
 */
function makeRingBonds(
    mol: MolecularGraph,
    smiles: string,
    ltoken: SMILESToken,
    latom: Atom,
    lpos: number,
    rtoken: SMILESToken,
    ratom: Atom
): void {
    if (mol.hasBond(latom.index!, ratom.index!)) {
        throw new SMILESParserError(smiles, 'ring bond specified between already-bonded atoms', ltoken.startIdx);
    }

    let lbondChar: string | null = ltoken.extractBondChar(smiles);
    let rbondChar: string | null = rtoken.extractBondChar(smiles);

    // Swap bonds if needed
    if (lbondChar === null && rbondChar !== null) {
        [lbondChar, rbondChar] = [rbondChar, lbondChar];
    }

    // Check that ring bonds match
    if (lbondChar !== rbondChar) {
        if (rbondChar !== null && 
            !(SMILES_STEREO_BONDS.has(lbondChar!) && SMILES_STEREO_BONDS.has(rbondChar))) {
            throw new SMILESParserError(smiles, 'mismatched ring bonds', ltoken.startIdx);
        }
    }

    let lorder: number, lstereo: string | null;
    let rorder: number, rstereo: string | null;
    [lorder, lstereo] = smilesToBond(lbondChar);
    [rorder, rstereo] = smilesToBond(rbondChar);

    // Handle implicit aromatic ring bonds
    if (latom.isAromatic && ratom.isAromatic && lbondChar === null && rbondChar === null) {
        lorder = rorder = 1.5;
    }

    mol.addRingBond(
        latom.index!, ratom.index!,
        Math.max(lorder, rorder),
        lstereo, rstereo,
        lpos
    );
}
