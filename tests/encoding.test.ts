/**
 * Tests for SELFIES encoding utilities
 */

/// <reference types="jest" />

import {
    selfiesToEncoding,
    encodingToSelfies,
    getAlphabetFromSelfies
} from '../src/index';

describe('Encoding Tests', () => {
    test('label encoding', () => {
        const vocab = { '[C]': 0, '[F]': 1 };
        const result = selfiesToEncoding('[C][F]', vocab, -1, 'label');
        expect(result).toEqual([0, 1]);
    });

    test('one-hot encoding', () => {
        const vocab = { '[C]': 0, '[F]': 1 };
        const result = selfiesToEncoding('[C][F]', vocab, -1, 'one_hot');
        expect(result).toEqual([[1, 0], [0, 1]]);
    });

    test('both encodings', () => {
        const vocab = { '[C]': 0, '[F]': 1 };
        const result = selfiesToEncoding('[C][F]', vocab, -1, 'both');
        expect(Array.isArray(result)).toBe(true);
        expect((result as any)[0]).toEqual([0, 1]);
        expect((result as any)[1]).toEqual([[1, 0], [0, 1]]);
    });

    test('encoding with padding', () => {
        const vocab = { '[C]': 0, '[F]': 1, '[nop]': 2 };
        const result = selfiesToEncoding('[C][F]', vocab, 4, 'label');
        expect(result).toEqual([0, 1, 2, 2]);
    });

    test('decoding from label', () => {
        const vocab = { 0: '[C]', 1: '[F]' };
        const result = encodingToSelfies([0, 1], vocab, 'label');
        expect(result).toBe('[C][F]');
    });

    test('decoding from one-hot', () => {
        const vocab = { 0: '[C]', 1: '[F]' };
        const result = encodingToSelfies([[1, 0], [0, 1]], vocab, 'one_hot');
        expect(result).toBe('[C][F]');
    });

    test('decoding skips nop', () => {
        const vocab = { 0: '[C]', 1: '[nop]', 2: '[F]' };
        const result = encodingToSelfies([0, 1, 1, 2], vocab, 'label');
        expect(result).toBe('[C][F]');
    });
});

describe('Alphabet Tests', () => {
    test('get alphabet from selfies list', () => {
        const selfiesList = ['[C][F][O]', '[C].[O]', '[F][F]'];
        const alphabet = getAlphabetFromSelfies(selfiesList);
        
        expect(alphabet.has('[C]')).toBe(true);
        expect(alphabet.has('[F]')).toBe(true);
        expect(alphabet.has('[O]')).toBe(true);
        expect(alphabet.has('.')).toBe(false); // . is excluded
        expect(alphabet.size).toBe(3);
    });

    test('alphabet with complex symbols', () => {
        const selfiesList = ['[C@@H1][NH1]', '[=C][#N]'];
        const alphabet = getAlphabetFromSelfies(selfiesList);
        
        expect(alphabet.has('[C@@H1]')).toBe(true);
        expect(alphabet.has('[NH1]')).toBe(true);
        expect(alphabet.has('[=C]')).toBe(true);
        expect(alphabet.has('[#N]')).toBe(true);
    });
});
