/**
 * SELFIES utility functions
 * Ported from Python SELFIES library v2.2.0
 */

/**
 * Returns the number of symbols in a given SELFIES string.
 */
export function lenSelfies(selfies: string): number {
    let count = 0;
    for (let i = 0; i < selfies.length; i++) {
        if (selfies[i] === '[' || selfies[i] === '.') {
            count++;
        }
    }
    return count;
}

/**
 * Tokenizes a SELFIES string into its individual symbols.
 */
export function* splitSelfies(selfies: string): Generator<string> {
    let leftIdx = selfies.indexOf('[');

    while (leftIdx >= 0 && leftIdx < selfies.length) {
        const rightIdx = selfies.indexOf(']', leftIdx + 1);
        
        if (rightIdx === -1) {
            throw new Error("Malformed SELFIES string, hanging '[' bracket");
        }

        const nextSymbol = selfies.substring(leftIdx, rightIdx + 1);
        yield nextSymbol;

        leftIdx = rightIdx + 1;
        if (selfies[leftIdx] === '.') {
            yield '.';
            leftIdx += 1;
        }
    }
}

/**
 * Tokenizes a SELFIES string into an array of symbols.
 */
export function splitSelfiesToArray(selfies: string): string[] {
    return Array.from(splitSelfies(selfies));
}

/**
 * Constructs an alphabet from an iterable of SELFIES strings.
 */
export function getAlphabetFromSelfies(selfiesIter: Iterable<string>): Set<string> {
    const alphabet = new Set<string>();
    
    for (const s of selfiesIter) {
        for (const symbol of splitSelfies(s)) {
            alphabet.add(symbol);
        }
    }
    
    alphabet.delete('.');
    return alphabet;
}
