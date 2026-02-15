# selfies-js

[![npm version](https://badge.fury.io/js/%40milicazm%2Fselfies-js.svg)](https://www.npmjs.com/package/@milicazm/selfies-js)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

JavaScript/TypeScript implementation of SELFIES (SELF-referencIng Embedded Strings), a molecular string representation designed for machine learning applications in chemistry.

## About

SELFIES is a string-based representation of molecules where every SELFIES string corresponds to a chemically valid molecule. This property makes SELFIES particularly useful for generative models and optimization algorithms in computational chemistry, where traditional representations like SMILES can produce invalid outputs.

This library provides a complete JavaScript/TypeScript implementation compatible with the Python SELFIES library (v2.2.0). It has been validated on 597,707 molecules from 14 datasets with 99.997% structure equivalence.

## Use Cases

- Generative models for drug discovery and materials science
- Molecular optimization algorithms
- Variational autoencoders (VAEs) for molecular design
- Reinforcement learning applications
- Web-based molecular tools and visualizations
- Machine learning pipelines requiring molecular representations

## Features

- Complete encoder and decoder with aromatic molecule support
- Automatic kekulization of aromatic SMILES
- TypeScript type definitions
- Zero runtime dependencies
- Compatible with Node.js 14+
- Semantic constraint checking for valid molecular structures  

## Installation

```bash
npm install @milicazm/selfies-js
```

or

```bash
yarn add @milicazm/selfies-js
```

## Quick Start

```typescript
import { encoder, decoder } from 'selfies-js';

// SMILES to SELFIES
const selfies = encoder('CCO');
console.log(selfies); // [C][C][O]

// SELFIES to SMILES
const smiles = decoder('[C][C][O]');
console.log(smiles); // CCO

// Aromatic molecules
const benzene = encoder('c1ccccc1');
console.log(benzene); // [C][=C][C][=C][C][=C][Ring1][=Branch1]
```

## API Reference

### Encoding & Decoding

#### `encoder(smiles, strict?, attribute?)`

Converts a SMILES string to SELFIES.

```typescript
import { encoder } from 'selfies-js';

// Basic encoding
const selfies = encoder('CCO');
// Returns: '[C][C][O]'

// With strict checking (validates bond constraints)
const selfies2 = encoder('CCO', true);

// With attribution tracking
const [selfies3, attribution] = encoder('CCO', true, true);
```

**Parameters:**
- `smiles` (string): Input SMILES string
- `strict` (boolean, optional): Check semantic constraints (default: true)
- `attribute` (boolean, optional): Return attribution information (default: false)

**Returns:** SELFIES string, or `[selfies, attribution]` if `attribute=true`

#### `decoder(selfies, printError?)`

Converts a SELFIES string to SMILES.

```typescript
import { decoder } from 'selfies-js';

const smiles = decoder('[C][C][O]');
// Returns: 'CCO'

// With error printing disabled
const smiles2 = decoder('[C][C][O]', false);
```

**Parameters:**
- `selfies` (string): Input SELFIES string
- `printError` (boolean, optional): Print errors to console (default: true)

**Returns:** SMILES string

### Utility Functions

#### `lenSelfies(selfies)`

Returns the number of symbols in a SELFIES string.

```typescript
import { lenSelfies } from 'selfies-js';

lenSelfies('[C][=C][F]'); // Returns: 3
```

####  `splitSelfies(selfies)`

Tokenizes a SELFIES string into individual symbols.

```typescript
import { splitSelfies } from 'selfies-js';

const symbols = Array.from(splitSelfies('[C][=C][F]'));
// Returns: ['[C]', '[=C]', '[F]']
```

#### `getAlphabetFromSelfies(selfiesList)`

Extracts the alphabet of symbols from a collection of SELFIES strings.

```typescript
import { getAlphabetFromSelfies } from 'selfies-js';

const alphabet = getAlphabetFromSelfies(['[C][C][O]', '[C][=C][F]']);
// Returns: Set(['[C]', '[O]', '[=C]', '[F]'])
```

### Machine Learning Utilities

#### `selfiesEncoder.label_encode(selfiesList)`

Encodes SELFIES strings as sequences of integers (label encoding).

```typescript
import { selfiesEncoder } from 'selfies-js';

const encoded = selfiesEncoder.label_encode(['[C][C][O]', '[C][=C][F]']);
// Returns integer sequences suitable for ML models
```

#### `selfiesEncoder.one_hot_encode(selfiesList)`

Encodes SELFIES strings as one-hot matrices.

```typescript
import { selfiesEncoder } from 'selfies-js';

const encoded = selfiesEncoder.one_hot_encode(['[C][C][O]', '[C][=C][F]']);
// Returns one-hot encoded matrices
```

### Bond Constraints

Manage semantic constraints for valid molecular structures.

```typescript
import { 
  getSemanticConstraints,
  setSemanticConstraints 
} from 'selfies-js';

// Get current constraints
const constraints = getSemanticConstraints();

// Set preset constraints
setSemanticConstraints('octet_rule');  // Strict octet rule
setSemanticConstraints('hypervalent'); // Allow hypervalent atoms
setSemanticConstraints('default');     // Default settings

// Set custom constraints
setSemanticConstraints({
  'C': 4,  // Carbon: max 4 bonds
  'N': 3,  // Nitrogen: max 3 bonds
  'O': 2,  // Oxygen: max 2 bonds
  '?': 8   // Default for other elements
});
```

## Examples

### Encoding Complex Structures

```typescript
import { encoder, decoder } from 'selfies-js';

// Caffeine
const caffeine = encoder('CN1C=NC2=C1C(=O)N(C(=O)N2C)C');
console.log(caffeine);
// [C][N][C][=N][C][=C][Ring1][Branch1][C][=Branch1][C][=O][N]...

// Aromatic molecules
const toluene = encoder('Cc1ccccc1');
const pyridine = encoder('c1ccncc1');
const naphthalene = encoder('c1ccc2ccccc2c1');

// Roundtrip verification
const roundtrip = decoder(encoder('CCO'));
console.log(roundtrip); // CCO
```

### Building a Molecular Dataset

```typescript
import { encoder, getAlphabetFromSelfies } from 'selfies-js';

// Convert SMILES dataset to SELFIES
const smilesDataset = ['CCO', 'C=CF', 'c1ccccc1'];
const selfiesDataset = smilesDataset.map(smiles => encoder(smiles));

// Extract alphabet for ML model
const alphabet = getAlphabetFromSelfies(selfiesDataset);
console.log(alphabet.size); // Number of unique symbols

// Create symbol-to-index mapping
const vocab = Array.from(alphabet);
const symbolToIdx = new Map(vocab.map((sym, i) => [sym, i]));
```

### Using in Machine Learning

```typescript
import { selfiesEncoder } from 'selfies-js';

const molecules = [
  '[C][C][O]',
  '[C][=C][F]',
  '[C][C](C)[C]'
];

// Label encoding for RNNs/LSTMs
const labelEncoded = selfiesEncoder.label_encode(molecules, {
  pad_to_len: 10,
  pad_with: '[nop]'
});

// One-hot encoding for CNNs
const oneHotEncoded = selfiesEncoder.one_hot_encode(molecules, {
  pad_to_len: 10,
  pad_with: '[nop]'
});

// Decode back from labels
const decoded = selfiesEncoder.label_decode(labelEncoded);
```

## CLI Tool

For quick testing, use the included CLI tool:

```bash
# Roundtrip test (encode + decode)
node selfies-cli.js "CCO"

# Encode only
node selfies-cli.js encode "c1ccccc1"

# Decode only
node selfies-cli.js decode "[C][=C][F]"

# Using npm script
npm run selfies -- "CCO"
```

## Examples Directory

Check out the `examples/` directory for:

- `basic-usage.js` - Simple encoding/decoding examples
- `ml-encoding.js` - Preparing data for machine learning
- `pharmaceutical-molecules.js` - Complex drug-like structures

Run examples:
```bash
node examples/basic-usage.js
node examples/ml-encoding.js
node examples/pharmaceutical-molecules.js
```

## Validation

This implementation has been tested against the Python SELFIES library (v2.2.0) on 597,707 molecules from multiple chemical datasets:

- Encoder success rate: 100% on valid molecules (597,420/597,707)
- Structure equivalence: 99.997% (597,404/597,420 successful encodings)
- Semantic constraints: 100% agreement (287 violations correctly identified)
- Decoder accuracy: 100% (identical SMILES output to Python version)
- Exact SELFIES match: 69.6% (415,700/597,420 molecules)

The lower exact match rate is due to kekulization variants in aromatic molecules, where both implementations produce valid but different arrangements of double bonds. The high structure equivalence rate (99.997%) confirms that decoded molecules are chemically identical.

## Compatibility Notes

This implementation maintains API compatibility with Python SELFIES v2.2.0. The decoder produces identical output. The encoder may produce different kekulization patterns for aromatic molecules, but these are chemically equivalent to the Python output.

## TypeScript Support

Full TypeScript definitions are included:

```typescript
import type { 
  ConstraintType,
  EncodingType,
  AttributionMap 
} from 'selfies-js';

function processMolecule(smiles: string): string {
  const selfies: string = encoder(smiles);
  return selfies;
}
```

## Browser Usage

SELFIES-JS works in browsers via bundlers (webpack, rollup, vite):

```typescript
import { encoder, decoder } from 'selfies-js';

// Use in React, Vue, Angular, etc.
function MoleculeConverter({ smiles }) {
  const selfies = encoder(smiles);
  return <div>{selfies}</div>;
}
```

## Citation

If you use this library in your research, please cite the original SELFIES paper:

```bibtex
@article{krenn2020self,
  title={Self-referencing embedded strings (SELFIES): A 100% robust molecular string representation},
  author={Krenn, Mario and H{\"a}se, Florian and Nigam, AkshatKumar and Friederich, Pascal and Aspuru-Guzik, Al{\'a}n},
  journal={Machine Learning: Science and Technology},
  volume={1},
  number={4},
  pages={045024},
  year={2020},
  publisher={IOP Publishing}
}
```

## License

Apache License 2.0

## Related

- [Python SELFIES library](https://github.com/aspuru-guzik-group/selfies) - Original implementation
- [SELFIES paper](https://iopscience.iop.org/article/10.1088/2632-2153/aba947) - Original publication
- [SELFIES documentation](https://selfies.readthedocs.io/) - API reference and tutorials

## Acknowledgments

This library is a JavaScript/TypeScript implementation based on the Python SELFIES library by Mario Krenn, Alston Lo, and the Aspuru-Guzik group.
