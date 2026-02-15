/**
 * Encoding utility functions for SELFIES
 * Ported from Python SELFIES library v2.2.0
 */

import { lenSelfies, splitSelfies } from './selfiesUtils';

/**
 * Converts a SELFIES string into its label (integer) and/or one-hot encoding.
 */
export function selfiesToEncoding(
    selfies: string,
    vocabStoi: { [key: string]: number },
    padToLen: number = -1,
    encType: 'label' | 'one_hot' | 'both' = 'both'
): number[] | number[][] | [number[], number[][]] {
    // Error checking
    if (!['label', 'one_hot', 'both'].includes(encType)) {
        throw new Error("enc_type must be in ('label', 'one_hot', 'both')");
    }

    // Pad with [nop]
    let paddedSelfies = selfies;
    if (padToLen > lenSelfies(selfies)) {
        const padding = '[nop]'.repeat(padToLen - lenSelfies(selfies));
        paddedSelfies += padding;
    }

    // Integer encode
    const integerEncoded: number[] = [];
    for (const char of splitSelfies(paddedSelfies)) {
        if (char === '.' && !(('.' in vocabStoi))) {
            throw new Error(
                "The SELFIES string contains two unconnected molecules " +
                "(given by the '.' character), but vocab_stoi does not " +
                "contain the '.' key. Please add it to the vocabulary " +
                "or separate the molecules."
            );
        }

        if (!(char in vocabStoi)) {
            throw new Error(`Symbol '${char}' not found in vocabulary`);
        }

        integerEncoded.push(vocabStoi[char]);
    }

    if (encType === 'label') {
        return integerEncoded;
    }

    // One-hot encode
    const oneHotEncoded: number[][] = [];
    const vocabSize = Object.keys(vocabStoi).length;

    for (const index of integerEncoded) {
        const letter = new Array(vocabSize).fill(0);
        letter[index] = 1;
        oneHotEncoded.push(letter);
    }

    if (encType === 'one_hot') {
        return oneHotEncoded;
    }

    return [integerEncoded, oneHotEncoded];
}

/**
 * Converts a label (integer) or one-hot encoding into a SELFIES string.
 */
export function encodingToSelfies(
    encoding: number[] | number[][],
    vocabItos: { [key: number]: string },
    encType: 'label' | 'one_hot'
): string {
    let indices: number[];

    if (encType === 'label') {
        indices = encoding as number[];
    } else if (encType === 'one_hot') {
        const oneHot = encoding as number[][];
        indices = oneHot.map(row => row.indexOf(1));
    } else {
        throw new Error("enc_type must be 'label' or 'one_hot'");
    }

    const symbols: string[] = [];
    for (const idx of indices) {
        if (!(idx in vocabItos)) {
            throw new Error(`Index ${idx} not found in vocabulary`);
        }
        const symbol = vocabItos[idx];
        if (symbol !== '[nop]') {
            symbols.push(symbol);
        }
    }

    return symbols.join('');
}

/**
 * Batch converts SELFIES strings to flat one-hot encoding.
 */
export function batchSelfiesToFlatHot(
    selfiesList: string[],
    vocabStoi: { [key: string]: number },
    padToLen: number = -1
): number[][] {
    const results: number[][] = [];

    for (const selfies of selfiesList) {
        const encoded = selfiesToEncoding(selfies, vocabStoi, padToLen, 'one_hot') as number[][];
        const flattened = encoded.flat();
        results.push(flattened);
    }

    return results;
}

/**
 * Batch converts flat one-hot encodings to SELFIES strings.
 */
export function batchFlatHotToSelfies(
    encodings: number[][],
    vocabItos: { [key: number]: string }
): string[] {
    const vocabSize = Object.keys(vocabItos).length;
    const results: string[] = [];

    for (const flat of encodings) {
        // Reshape flat array to one-hot
        const oneHot: number[][] = [];
        for (let i = 0; i < flat.length; i += vocabSize) {
            oneHot.push(flat.slice(i, i + vocabSize));
        }

        const selfies = encodingToSelfies(oneHot, vocabItos, 'one_hot');
        results.push(selfies);
    }

    return results;
}
