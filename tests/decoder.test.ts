/**
 * Tests for SELFIES decoder functionality
 * Ported from Python SELFIES test suite
 */

/// <reference types="jest" />

import { decoder, lenSelfies, splitSelfiesToArray } from '../src/index';

describe('SELFIES Decoder Tests', () => {
    test('decode simple molecules', () => {
        expect(decoder('[C][=C][F]')).toBe('C=CF');
        expect(decoder('[C][C][C][C]')).toBe('CCCC');
        expect(decoder('[C][O][H]')).toBe('CO[H]');
    });

    test('decode benzene', () => {
        const benzene = '[C][=C][C][=C][C][=C][Ring1][=Branch1]';
        const decoded = decoder(benzene);
        // Basic ring structure should be present
        expect(decoded).toContain('C');
        expect(decoded.length).toBeGreaterThan(1);
    });

    test('branch and ring at state X0', () => {
        expect(decoder('[Branch3][C][S][C][O]')).toBe('CSCO');
        expect(decoder('[Ring3][C][S][C][O]')).toBe('CSCO');
        expect(decoder('[Branch1][Ring1][Ring3][C][S][C][O]')).toBe('CSCO');
    });

    test('branch at state X1', () => {
        expect(decoder('[C][C][O][Branch1][C][I]')).toBe('CCOCI');
        expect(decoder('[C][C][C][O][#Branch3][C][I]')).toBe('CCCOCI');
    });

    test('branch and ring decrement state', () => {
        const result1 = decoder('[C][C][C][Ring1][Ring1][#C]');
        const result2 = decoder('[C][=C][Branch1][C][=C][#C]');
        expect(result1).toContain('C');
        expect(result2).toContain('C');
    });

    test('branch at end of selfies', () => {
        expect(decoder('[C][C][C][C][Branch1]')).toBe('CCCC');
        expect(decoder('[C][C][C][C][#Branch3]')).toBe('CCCC');
    });

    test('ring at end of selfies', () => {
        const result1 = decoder('[C][C][C][C][C][Ring1]');
        const result2 = decoder('[C][C][C][C][C][Ring3]');
        expect(result1).toContain('C');
        expect(result2).toContain('C');
    });

    test('branch with no atoms', () => {
        expect(decoder('[C][Branch1][Ring2][Branch1][Branch1][Branch1][F]')).toBe('CF');
        expect(decoder('[C][Branch1][Ring2][Ring1][Ring1][Branch1][F]')).toBe('CF');
    });

    test('decode with fragments', () => {
        const result = decoder('[C][O].[N][H]');
        const smiles = typeof result === 'string' ? result : result[0];
        expect(smiles).toContain('.');
        expect(smiles).toContain('CO');
        expect(smiles).toContain('N[H]');
    });

    test('nop symbols are skipped', () => {
        expect(decoder('[C][nop][O][nop][nop][H]')).toBe('CO[H]');
        expect(decoder('[nop][nop][C][C]')).toBe('CC');
    });
});

describe('SELFIES Utility Functions', () => {
    test('lenSelfies counts symbols correctly', () => {
        expect(lenSelfies('[C][=C][F]')).toBe(3);
        expect(lenSelfies('[C][F].[C]')).toBe(4); // includes the . separator
        expect(lenSelfies('[C][C][C][C]')).toBe(4);
        expect(lenSelfies('')).toBe(0);
    });

    test('splitSelfies tokenizes correctly', () => {
        const symbols = splitSelfiesToArray('[C][=C][F]');
        expect(symbols).toEqual(['[C]', '[=C]', '[F]']);

        const symbols2 = splitSelfiesToArray('[C][F].[C]');
        expect(symbols2).toEqual(['[C]', '[F]', '.', '[C]']);
    });

    test('splitSelfies handles complex symbols', () => {
        const symbols = splitSelfiesToArray('[C@@H1][NH1][Branch1][Ring2]');
        expect(symbols).toEqual(['[C@@H1]', '[NH1]', '[Branch1]', '[Ring2]']);
    });
});

describe('Edge Cases', () => {
    test('empty SELFIES', () => {
        expect(decoder('')).toBe('');
    });

    test('single atom', () => {
        expect(decoder('[C]')).toBe('C');
        expect(decoder('[O]')).toBe('O');
        expect(decoder('[N]')).toBe('N');
    });

    test('atoms with charges', () => {
        const result = decoder('[O+1]');
        expect(result).toContain('O');
    });

    test('atoms with hydrogen count', () => {
        const result = decoder('[CH1]');
        expect(result).toContain('C');
    });

    test('multiple fragments', () => {
        const result = decoder('[C].[O].[N]');
        const smiles = typeof result === 'string' ? result : result[0];
        expect(smiles.split('.').length).toBe(3);
    });
});
