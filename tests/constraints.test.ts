/**
 * Tests for bond constraints and semantic constraints
 */

/// <reference types="jest" />

import {
    getPresetConstraints,
    getSemanticConstraints,
    setSemanticConstraints,
    getSemanticRobustAlphabet
} from '../src/index';

describe('Bond Constraints Tests', () => {
    beforeEach(() => {
        // Reset to defaults before each test
        setSemanticConstraints('default');
    });

    test('get default constraints', () => {
        const constraints = getPresetConstraints('default');
        expect(constraints['C']).toBe(4);
        expect(constraints['O']).toBe(2);
        expect(constraints['N']).toBe(3);
        expect(constraints['H']).toBe(1);
    });

    test('get octet_rule constraints', () => {
        const constraints = getPresetConstraints('octet_rule');
        expect(constraints['S']).toBe(2); // Different from default
        expect(constraints['P']).toBe(3); // Different from default
    });

    test('get hypervalent constraints', () => {
        const constraints = getPresetConstraints('hypervalent');
        expect(constraints['Cl']).toBe(7);
        expect(constraints['Br']).toBe(7);
        expect(constraints['N']).toBe(5);
    });

    test('set constraints by name', () => {
        setSemanticConstraints('octet_rule');
        const constraints = getSemanticConstraints();
        expect(constraints['S']).toBe(2);
    });

    test('set custom constraints', () => {
        const custom = {
            'C': 4,
            'N': 3,
            'O': 2,
            '?': 8
        };
        setSemanticConstraints(custom);
        const constraints = getSemanticConstraints();
        expect(constraints['C']).toBe(4);
        expect(constraints['?']).toBe(8);
    });

    test('custom constraints require ? key', () => {
        const invalid = { 'C': 4, 'N': 3 };
        expect(() => setSemanticConstraints(invalid)).toThrow();
    });

    test('constraints validate element symbols', () => {
        const invalid = { 'Xx': 4, '?': 8 };
        expect(() => setSemanticConstraints(invalid)).toThrow();
    });

    test('constraints validate charge format', () => {
        const valid = { 'C+1': 3, 'N-1': 2, '?': 8 };
        expect(() => setSemanticConstraints(valid)).not.toThrow();
    });
});

describe('Semantic Robust Alphabet Tests', () => {
    beforeEach(() => {
        setSemanticConstraints('default');
    });

    test('alphabet contains basic atoms', () => {
        const alphabet = getSemanticRobustAlphabet();
        expect(alphabet.has('[C]')).toBe(true);
        expect(alphabet.has('[O]')).toBe(true);
        expect(alphabet.has('[N]')).toBe(true);
        expect(alphabet.has('[H]')).toBe(true);
    });

    test('alphabet contains bond variations', () => {
        const alphabet = getSemanticRobustAlphabet();
        expect(alphabet.has('[=C]')).toBe(true);
        expect(alphabet.has('[#C]')).toBe(true);
    });

    test('alphabet contains ring and branch symbols', () => {
        const alphabet = getSemanticRobustAlphabet();
        expect(alphabet.has('[Ring1]')).toBe(true);
        expect(alphabet.has('[Ring2]')).toBe(true);
        expect(alphabet.has('[Branch1]')).toBe(true);
        expect(alphabet.has('[=Branch1]')).toBe(true);
    });

    test('alphabet contains nop', () => {
        const alphabet = getSemanticRobustAlphabet();
        expect(alphabet.has('[nop]')).toBe(true);
    });

    test('alphabet contains charged species', () => {
        const alphabet = getSemanticRobustAlphabet();
        expect(alphabet.has('[C+1]')).toBe(true);
        expect(alphabet.has('[O-1]')).toBe(true);
    });

    test('alphabet size is reasonable', () => {
        const alphabet = getSemanticRobustAlphabet();
        // Should have many symbols but not an unreasonable number
        expect(alphabet.size).toBeGreaterThan(50);
        expect(alphabet.size).toBeLessThan(10000);
    });
});
