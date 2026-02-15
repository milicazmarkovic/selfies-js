/**
 * Custom exception classes for SELFIES
 * Ported from Python SELFIES library v2.2.0
 */

export class SMILESParserError extends Error {
    smiles: string;
    idx: number;
    reason: string;

    constructor(smiles: string, reason: string = "N/A", idx: number = -1) {
        const errMsg = `\n\tSMILES: ${smiles}\n\t        ${" ".repeat(idx)}^\n\tIndex:  ${idx}\n\tReason: ${reason}`;
        super(errMsg);
        this.name = "SMILESParserError";
        this.smiles = smiles;
        this.idx = idx;
        this.reason = reason;
    }
}

export class EncoderError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "EncoderError";
    }
}

export class DecoderError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "DecoderError";
    }
}
