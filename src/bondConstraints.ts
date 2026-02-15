/**
 * Bond constraints and semantic constraints management
 * Ported from Python SELFIES library v2.2.0
 */

import { ELEMENTS, INDEX_ALPHABET } from './constants';

const DEFAULT_CONSTRAINTS: { [key: string]: number } = {
    "H": 1, "F": 1, "Cl": 1, "Br": 1, "I": 1,
    "B": 3, "B+1": 2, "B-1": 4,
    "O": 2, "O+1": 3, "O-1": 1,
    "N": 3, "N+1": 4, "N-1": 2,
    "C": 4, "C+1": 3, "C-1": 3,
    "P": 5, "P+1": 4, "P-1": 6,
    "S": 6, "S+1": 5, "S-1": 5,
    "?": 8
};

const PRESET_CONSTRAINTS: { [key: string]: { [key: string]: number } } = {
    "default": { ...DEFAULT_CONSTRAINTS },
    "octet_rule": { ...DEFAULT_CONSTRAINTS },
    "hypervalent": { ...DEFAULT_CONSTRAINTS }
};

// Update octet_rule constraints
PRESET_CONSTRAINTS["octet_rule"] = {
    ...PRESET_CONSTRAINTS["octet_rule"],
    "S": 2, "S+1": 3, "S-1": 1,
    "P": 3, "P+1": 4, "P-1": 2
};

// Update hypervalent constraints
PRESET_CONSTRAINTS["hypervalent"] = {
    ...PRESET_CONSTRAINTS["hypervalent"],
    "Cl": 7, "Br": 7, "I": 7, "N": 5
};

let currentConstraints: { [key: string]: number } = { ...PRESET_CONSTRAINTS["default"] };

// Caches
let bondingCapacityCache: { [key: string]: number } = {};
let semanticRobustAlphabetCache: Set<string> | null = null;

/**
 * Returns the preset semantic constraints with the given name.
 */
export function getPresetConstraints(name: string): { [key: string]: number } {
    if (!(name in PRESET_CONSTRAINTS)) {
        throw new Error(`Unrecognized preset name '${name}'`);
    }
    return { ...PRESET_CONSTRAINTS[name] };
}

/**
 * Returns the semantic constraints that selfies is currently operating on.
 */
export function getSemanticConstraints(): { [key: string]: number } {
    return { ...currentConstraints };
}

/**
 * Updates the semantic constraints that selfies operates on.
 */
export function setSemanticConstraints(
    bondConstraints: string | { [key: string]: number } = "default"
): void {
    if (typeof bondConstraints === "string") {
        currentConstraints = getPresetConstraints(bondConstraints);
    } else if (typeof bondConstraints === "object") {
        // Error checking
        if (!("?" in bondConstraints)) {
            throw new Error("bond_constraints missing '?' as a key");
        }

        for (const [key, value] of Object.entries(bondConstraints)) {
            // Error checking for keys
            const j = Math.max(key.indexOf("+"), key.indexOf("-"));
            let valid = false;
            
            if (key === "?") {
                valid = true;
            } else if (j === -1) {
                valid = ELEMENTS.has(key);
            } else {
                const element = key.substring(0, j);
                const chargeStr = key.substring(j + 1);
                valid = ELEMENTS.has(element) && /^\d+$/.test(chargeStr);
            }

            if (!valid) {
                throw new Error(`Invalid key '${key}' in bond_constraints`);
            }

            // Error checking for values
            if (typeof value !== "number" || value < 0 || !Number.isInteger(value)) {
                throw new Error(`Invalid value at bond_constraints['${key}'] = ${value}`);
            }
        }

        currentConstraints = { ...bondConstraints };
    } else {
        throw new Error("bond_constraints must be a string or object");
    }

    // Clear caches since we changed alphabet
    bondingCapacityCache = {};
    semanticRobustAlphabetCache = null;
}

/**
 * Get bonding capacity for an element with a given charge.
 */
export function getBondingCapacity(element: string, charge: number): number {
    const key = charge === 0 ? element : `${element}${charge > 0 ? '+' : ''}${charge}`;
    
    if (key in bondingCapacityCache) {
        return bondingCapacityCache[key];
    }

    let capacity: number;
    
    if (key in currentConstraints) {
        capacity = currentConstraints[key];
    } else {
        capacity = currentConstraints["?"];
    }

    bondingCapacityCache[key] = capacity;
    return capacity;
}

/**
 * Returns the SELFIES alphabet that is robust under the semantic constraints.
 */
export function getSemanticRobustAlphabet(): Set<string> {
    if (semanticRobustAlphabetCache !== null) {
        return new Set(semanticRobustAlphabetCache);
    }

    const alphabet = new Set<string>();

    // Add all element-based symbols
    for (const element of ELEMENTS) {
        for (const charge of [-1, 0, 1]) {
            const bondCap = getBondingCapacity(element, charge);
            
            if (bondCap >= 1) {
                // Basic atom symbols
                const chargeStr = charge === 0 ? "" : (charge > 0 ? `+${charge}` : `${charge}`);
                alphabet.add(`[${element}${chargeStr}]`);

                // With bonds
                if (bondCap >= 2) {
                    alphabet.add(`[=${element}${chargeStr}]`);
                }
                if (bondCap >= 3) {
                    alphabet.add(`[#${element}${chargeStr}]`);
                }

                // With hydrogen counts
                for (let hCount = 0; hCount <= bondCap; hCount++) {
                    if (hCount > 0) {
                        const hStr = `H${hCount}`;
                        alphabet.add(`[${element}${chargeStr}${hStr}]`);
                        
                        if (bondCap - hCount >= 2) {
                            alphabet.add(`[=${element}${chargeStr}${hStr}]`);
                        }
                        if (bondCap - hCount >= 3) {
                            alphabet.add(`[#${element}${chargeStr}${hStr}]`);
                        }
                    }
                }
            }
        }
    }

    // Add branch and ring symbols
    for (const symbol of INDEX_ALPHABET) {
        alphabet.add(symbol);
    }

    // Add special symbols
    alphabet.add("[nop]");

    semanticRobustAlphabetCache = alphabet;
    return new Set(alphabet);
}
