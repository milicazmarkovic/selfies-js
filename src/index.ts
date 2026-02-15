/**
 * SELFIES-JS: JavaScript/TypeScript implementation of SELFIES
 * (SELF-referencIng Embedded Strings)
 * 
 * A 100% robust molecular string representation for chemistry and machine learning.
 * Ported from Python SELFIES library v2.2.0
 * 
 * @author Ported to JavaScript/TypeScript
 * @version 2.0.0
 * @license Apache-2.0
 * 
 * Original Python library:
 * @author Mario Krenn, Alston Lo, et al.
 * @see https://github.com/aspuru-guzik-group/selfies
 */

// Core functions
import { encoder as encoderFunc } from './encoder';
import { decoder as decoderFunc } from './decoder';

// Bond constraints
import {
    getPresetConstraints as getPresetConstraintsFunc,
    getSemanticConstraints as getSemanticConstraintsFunc,
    setSemanticConstraints as setSemanticConstraintsFunc,
    getSemanticRobustAlphabet as getSemanticRobustAlphabetFunc
} from './bondConstraints';

// Utility functions
import {
    lenSelfies as lenSelfiesFunc,
    splitSelfies as splitSelfiesFunc,
    splitSelfiesToArray as splitSelfiesToArrayFunc,
    getAlphabetFromSelfies as getAlphabetFromSelfiesFunc
} from './utils/selfiesUtils';

import {
    selfiesToEncoding as selfiesToEncodingFunc,
    encodingToSelfies as encodingToSelfiesFunc,
    batchSelfiesToFlatHot as batchSelfiesToFlatHotFunc,
    batchFlatHotToSelfies as batchFlatHotToSelfiesFunc
} from './utils/encodingUtils';

// Re-export everything
export { encoderFunc as encoder };
export { decoderFunc as decoder };
export { getPresetConstraintsFunc as getPresetConstraints };
export { getSemanticConstraintsFunc as getSemanticConstraints };
export { setSemanticConstraintsFunc as setSemanticConstraints };
export { getSemanticRobustAlphabetFunc as getSemanticRobustAlphabet };
export { lenSelfiesFunc as lenSelfies };
export { splitSelfiesFunc as splitSelfies };
export { splitSelfiesToArrayFunc as splitSelfiesToArray };
export { getAlphabetFromSelfiesFunc as getAlphabetFromSelfies };
export { selfiesToEncodingFunc as selfiesToEncoding };
export { encodingToSelfiesFunc as encodingToSelfies };
export { batchSelfiesToFlatHotFunc as batchSelfiesToFlatHot };
export { batchFlatHotToSelfiesFunc as batchFlatHotToSelfies };

// Exceptions
export {
    EncoderError,
    DecoderError,
    SMILESParserError
} from './exceptions';

// Types (for TypeScript users)
export type { Attribution, AttributionMap } from './molGraph';

/**
 * Version information
 */
export const VERSION = '2.0.0';

/**
 * Main SELFIES class for object-oriented usage
 */
export class SELFIES {
    private selfiesString: string;

    constructor(selfies: string) {
        this.selfiesString = selfies;
    }

    /**
     * Get the SELFIES string
     */
    toString(): string {
        return this.selfiesString;
    }

    /**
     * Get the length (number of symbols) in the SELFIES string
     */
    get length(): number {
        return lenSelfiesFunc(this.selfiesString);
    }

    /**
     * Split the SELFIES string into individual symbols
     */
    split(): string[] {
        return splitSelfiesToArrayFunc(this.selfiesString);
    }

    /**
     * Decode to SMILES
     */
    toSmiles(): string {
        const result = decoderFunc(this.selfiesString);
        return typeof result === 'string' ? result : result[0];
    }

    /**
     * Encode from SMILES
     */
    static fromSmiles(smiles: string): SELFIES {
        const result = encoderFunc(smiles);
        const selfiesStr = typeof result === 'string' ? result : result[0];
        return new SELFIES(selfiesStr);
    }

    /**
     * Convert to label encoding
     */
    toLabelEncoding(vocab: { [key: string]: number }, padToLen: number = -1): number[] {
        return selfiesToEncodingFunc(this.selfiesString, vocab, padToLen, 'label') as number[];
    }

    /**
     * Convert to one-hot encoding
     */
    toOneHotEncoding(vocab: { [key: string]: number }, padToLen: number = -1): number[][] {
        return selfiesToEncodingFunc(this.selfiesString, vocab, padToLen, 'one_hot') as number[][];
    }

    /**
     * Create from label encoding
     */
    static fromLabelEncoding(encoding: number[], vocab: { [key: number]: string }): SELFIES {
        const selfiesStr = encodingToSelfiesFunc(encoding, vocab, 'label');
        return new SELFIES(selfiesStr);
    }

    /**
     * Create from one-hot encoding
     */
    static fromOneHotEncoding(encoding: number[][], vocab: { [key: number]: string }): SELFIES {
        const selfiesStr = encodingToSelfiesFunc(encoding, vocab, 'one_hot');
        return new SELFIES(selfiesStr);
    }
}

// Default export
export default {
    encoder: encoderFunc,
    decoder: decoderFunc,
    getPresetConstraints: getPresetConstraintsFunc,
    getSemanticConstraints: getSemanticConstraintsFunc,
    setSemanticConstraints: setSemanticConstraintsFunc,
    getSemanticRobustAlphabet: getSemanticRobustAlphabetFunc,
    lenSelfies: lenSelfiesFunc,
    splitSelfies: splitSelfiesFunc,
    splitSelfiesToArray: splitSelfiesToArrayFunc,
    getAlphabetFromSelfies: getAlphabetFromSelfiesFunc,
    selfiesToEncoding: selfiesToEncodingFunc,
    encodingToSelfies: encodingToSelfiesFunc,
    batchSelfiesToFlatHot: batchSelfiesToFlatHotFunc,
    batchFlatHotToSelfies: batchFlatHotToSelfiesFunc,
    SELFIES,
    VERSION
};
