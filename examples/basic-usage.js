/**
 * Basic SELFIES-JS Usage Examples
 */

const selfies = require('../dist');
const { encoder, decoder, lenSelfies, splitSelfies } = selfies;

console.log('=== Basic Encoding/Decoding ===\n');

// Simple molecules
const ethanol = encoder('CCO');
console.log('Ethanol SMILES:', 'CCO');
console.log('Ethanol SELFIES:', ethanol);
console.log('Decoded back:', decoder(ethanol));
console.log();

// Aromatic molecules
const benzene = encoder('c1ccccc1');
console.log('Benzene SMILES:', 'c1ccccc1');
console.log('Benzene SELFIES:', benzene);
console.log('Decoded back:', decoder(benzene));
console.log();

const caffeine = encoder('CN1C=NC2=C1C(=O)N(C(=O)N2C)C');
console.log('Caffeine SMILES:', 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C');
console.log('Caffeine SELFIES:', caffeine);
console.log('Symbol count:', lenSelfies(caffeine));
console.log();

console.log('=== Working with SELFIES Strings ===\n');

const testSelfies = '[C][=C][F]';
console.log('SELFIES:', testSelfies);
console.log('Length:', lenSelfies(testSelfies));
console.log('Symbols:', Array.from(splitSelfies(testSelfies)));
console.log('Decoded:', decoder(testSelfies));
console.log();

console.log('=== Batch Processing ===\n');

const smilesList = [
    'CCO',           // Ethanol
    'C=CF',          // Fluoroethene
    'c1ccccc1',      // Benzene
    'c1ccncc1',      // Pyridine
    'CC(C)=O'        // Acetone
];

console.log('Converting', smilesList.length, 'molecules to SELFIES:\n');
smilesList.forEach((smiles, i) => {
    const selfiesStr = encoder(smiles);
    const decoded = decoder(selfiesStr);
    console.log(`${i + 1}. ${smiles} → ${selfiesStr}`);
    console.log(`   Roundtrip: ${decoded}\n`);
});
