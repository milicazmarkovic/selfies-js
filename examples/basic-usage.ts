/**
 * Basic usage examples for SELFIES-JS
 */

import {
  encoder,
  decoder,
  SELFIES,
  lenSelfies,
  splitSelfiesToArray,
  getAlphabetFromSelfies,
  selfiesToEncoding,
  encodingToSelfies,
  setSemanticConstraints,
  getSemanticRobustAlphabet
} from '../src/index';

// ============================================================================
// Example 1: Basic SELFIES encoding and decoding
// ============================================================================

console.log('=== Example 1: Basic Usage ===');

// Simple molecules
const molecules = ['C=CF', 'CCCC', 'COH'];

for (const smiles of molecules) {
  try {
    const selfiesResult = encoder(smiles);
    const selfiesStr = typeof selfiesResult === 'string' ? selfiesResult : selfiesResult[0];
    const decodedResult = decoder(selfiesStr);
    const decodedSmiles = typeof decodedResult === 'string' ? decodedResult : decodedResult[0];
    console.log(`SMILES: ${smiles} -> SELFIES: ${selfiesStr} -> SMILES: ${decodedSmiles}`);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`Error processing ${smiles}:`, errMsg);
  }
}

// ============================================================================
// Example 2: Object-Oriented API
// ============================================================================

console.log('\n=== Example 2: Object-Oriented API ===');

try {
  const mol = SELFIES.fromSmiles('C=CF');
  console.log('SELFIES string:', mol.toString());
  console.log('Length:', mol.length);
  console.log('Symbols:', mol.split());
  console.log('Back to SMILES:', mol.toSmiles());
} catch (error) {
  const errMsg = error instanceof Error ? error.message : String(error);
  console.error('Error:', errMsg);
}

// ============================================================================
// Example 3: Working with SELFIES strings
// ============================================================================

console.log('\n=== Example 3: SELFIES Utilities ===');

const selfiesString = '[C][=C][F]';

console.log('SELFIES:', selfiesString);
console.log('Length:', lenSelfies(selfiesString));
console.log('Symbols:', splitSelfiesToArray(selfiesString));
console.log('Decoded:', decoder(selfiesString));

// ============================================================================
// Example 4: Building an alphabet from a dataset
// ============================================================================

console.log('\n=== Example 4: Alphabet Extraction ===');

const selfiesDataset = [
  '[C][F][O]',
  '[C].[O]',
  '[F][F]',
  '[C][=C][N]',
  '[C][#C][C]'
];

const alphabet = getAlphabetFromSelfies(selfiesDataset);
console.log('Unique symbols:', Array.from(alphabet).slice(0, 10));
console.log('Alphabet size:', alphabet.size);

// ============================================================================
// Example 5: Encoding for Machine Learning
// ============================================================================

console.log('\n=== Example 5: ML Encodings ===');

// Build vocabulary
const vocab: { [key: string]: number } = {};
let idx = 0;
for (const symbol of alphabet) {
  vocab[symbol] = idx++;
}
vocab['[nop]'] = idx; // padding symbol

console.log('Vocabulary size:', Object.keys(vocab).length);

// Label encoding
const labelEncoded = selfiesToEncoding('[C][=C][F]', vocab, -1, 'label') as number[];
console.log('Label encoded:', labelEncoded);

// One-hot encoding
const oneHotEncoded = selfiesToEncoding('[C][F]', vocab, -1, 'one_hot') as number[][];
console.log('One-hot shape:', `${oneHotEncoded.length} x ${oneHotEncoded[0].length}`);

// Encoding with padding
const paddedEncoded = selfiesToEncoding('[C][F]', vocab, 5, 'label') as number[];
console.log('Padded encoded (length 5):', paddedEncoded);

// Decoding back
const vocabReverse: { [key: number]: string } = {};
for (const [symbol, index] of Object.entries(vocab)) {
  vocabReverse[index] = symbol;
}

const decoded = encodingToSelfies(labelEncoded, vocabReverse, 'label');
console.log('Decoded from labels:', decoded);

// ============================================================================
// Example 6: Semantic Constraints
// ============================================================================

console.log('\n=== Example 6: Semantic Constraints ===');

// Use different constraint sets
setSemanticConstraints('default');
console.log('Default alphabet size:', getSemanticRobustAlphabet().size);

setSemanticConstraints('octet_rule');
console.log('Octet rule alphabet size:', getSemanticRobustAlphabet().size);

setSemanticConstraints('hypervalent');
console.log('Hypervalent alphabet size:', getSemanticRobustAlphabet().size);

// Custom constraints
setSemanticConstraints({
  'C': 4,
  'N': 3,
  'O': 2,
  'H': 1,
  'F': 1,
  '?': 8
});
console.log('Custom alphabet size:', getSemanticRobustAlphabet().size);

// Reset to default
setSemanticConstraints('default');

// ============================================================================
// Example 7: Handling fragments
// ============================================================================

console.log('\n=== Example 7: Molecular Fragments ===');

const fragmentSELFIES = '[C][O].[N][H]';
console.log('Fragment SELFIES:', fragmentSELFIES);
console.log('Decoded:', decoder(fragmentSELFIES));
console.log('Number of symbols:', lenSelfies(fragmentSELFIES));

// ============================================================================
// Example 8: Random SELFIES generation (for generative models)
// ============================================================================

console.log('\n=== Example 8: Random SELFIES Generation ===');

function generateRandomSELFIES(alphabet: string[], length: number): string {
  const symbols: string[] = [];
  for (let i = 0; i < length; i++) {
    const randomIdx = Math.floor(Math.random() * alphabet.length);
    symbols.push(alphabet[randomIdx]);
  }
  return symbols.join('');
}

const robustAlphabet = Array.from(getSemanticRobustAlphabet());
for (let i = 0; i < 5; i++) {
  const randomSELFIES = generateRandomSELFIES(robustAlphabet, 8);
  const randomSMILES = decoder(randomSELFIES);
  console.log(`Random ${i + 1}: ${randomSELFIES.slice(0, 30)}... -> ${randomSMILES}`);
}

console.log('\n=== All Examples Complete ===');
