/**
 * Machine Learning with SELFIES-JS
 */

const { 
    encoder, 
    selfiesEncoder,
    getAlphabetFromSelfies 
} = require('../dist');

console.log('=== Preparing SELFIES for Machine Learning ===\n');

// Sample molecular dataset (SMILES)
const smilesDataset = [
    'CCO',
    'C=CF',
    'c1ccccc1',
    'CC(C)=O',
    'c1ccncc1',
    'CN1C=NC2=C1C(=O)N(C(=O)N2C)C'
];

console.log('1. Converting SMILES to SELFIES\n');
const selfiesDataset = smilesDataset.map(smiles => {
    const selfiesStr = encoder(smiles);
    console.log(`   ${smiles.padEnd(35)} → ${selfiesStr.substring(0, 60)}...`);
    return selfiesStr;
});

console.log('\n2. Extracting Vocabulary\n');
const alphabet = getAlphabetFromSelfies(selfiesDataset);
console.log('   Unique symbols:', alphabet.size);
console.log('   Alphabet:', Array.from(alphabet).slice(0, 10).join(', '), '...');

// Create vocabulary mapping
const vocab = Array.from(alphabet).sort();
const symbolToIdx = new Map(vocab.map((sym, idx) => [sym, idx]));
const idxToSymbol = new Map(vocab.map((sym, idx) => [idx, sym]));

console.log('\n3. Label Encoding (for RNNs/LSTMs/Transformers)\n');
const labelEncoded = selfiesEncoder.label_encode(selfiesDataset, {
    pad_to_len: 30,
    pad_with: '[nop]'
});

console.log('   Shape:', `${labelEncoded.length} molecules x ${labelEncoded[0].length} symbols`);
console.log('   Example encoded:', labelEncoded[0].slice(0, 20), '...');

console.log('\n4. One-Hot Encoding (for CNNs)\n');
const oneHotEncoded = selfiesEncoder.one_hot_encode(selfiesDataset, {
    pad_to_len: 30,
    pad_with: '[nop]'
});

console.log('   Shape:', `${oneHotEncoded.length} molecules x ${oneHotEncoded[0].length} positions x ${oneHotEncoded[0][0].length} symbols`);
console.log('   First symbol one-hot:', oneHotEncoded[0][0]);

console.log('\n5. Decoding Back\n');
const decoded = selfiesEncoder.label_decode(labelEncoded);
console.log('   Original:', selfiesDataset[0]);
console.log('   Decoded: ', decoded[0]);
console.log('   Match:', decoded[0] === selfiesDataset[0] ? '✓' : '✗');

console.log('\n=== Using Custom Vocabulary ===\n');

// Manual encoding with custom vocabulary
function encodeWithVocab(selfiesStr, vocab) {
    const symbols = Array.from(require('../dist').splitSelfies(selfiesStr));
    return symbols.map(sym => vocab.get(sym) ?? vocab.get('[nop]'));
}

const encoded = encodeWithVocab(selfiesDataset[0], symbolToIdx);
console.log('Custom encoding:', encoded);

console.log('\n=== Dataset Statistics ===\n');

const lengths = selfiesDataset.map(s => require('../dist').lenSelfies(s));
console.log('   Min length:', Math.min(...lengths));
console.log('   Max length:', Math.max(...lengths));
console.log('   Avg length:', (lengths.reduce((a, b) => a + b) / lengths.length).toFixed(1));
console.log('   Vocabulary size:', alphabet.size);
