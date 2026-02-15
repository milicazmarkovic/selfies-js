/**
 * Pharmaceutical Molecules Examples
 * 
 * Demonstrates SELFIES-JS with complex drug-like molecules
 */

const { encoder, decoder, lenSelfies } = require('../dist');

console.log('=== Pharmaceutical Molecules ===\n');

const drugs = [
    {
        name: 'Aspirin',
        smiles: 'CC(=O)Oc1ccccc1C(=O)O'
    },
    {
        name: 'Caffeine',
        smiles: 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C'
    },
    {
        name: 'Ibuprofen',
        smiles: 'CC(C)Cc1ccc(cc1)C(C)C(=O)O'
    },
    {
        name: 'Penicillin G',
        smiles: 'CC1(C)SC2C(NC(=O)Cc3ccccc3)C(=O)N2C1C(=O)O'
    },
    {
        name: 'Morphine',
        smiles: 'CN1CC[C@]23[C@@H]4[C@H]1C[C@H](O)[C@H]2Oc5c3c(ccc5O)C=C4'
    },
    {
        name: 'Dopamine',
        smiles: 'NCCc1ccc(O)c(O)c1'
    },
    {
        name: 'Sertraline (Zoloft)',
        smiles: 'CN[C@H]1CC[C@H](c2ccc(Cl)c(Cl)c2)c3ccccc13'
    },
    {
        name: 'Atorvastatin (Lipitor)',
        smiles: 'CC(C)c1c(C(=O)Nc2ccccc2)c(-c3ccccc3)c(-c3ccc(F)cc3)n1CC[C@@H](O)C[C@@H](O)CC(=O)O'
    }
];

drugs.forEach((drug, i) => {
    console.log(`${i + 1}. ${drug.name}`);
    console.log(`   SMILES:  ${drug.smiles}`);
    
    try {
        const selfies = encoder(drug.smiles);
        const roundtrip = decoder(selfies);
        const symbols = lenSelfies(selfies);
        
        console.log(`   SELFIES: ${selfies.substring(0, 70)}${selfies.length > 70 ? '...' : ''}`);
        console.log(`   Symbols: ${symbols}`);
        console.log(`   Roundtrip: ${roundtrip.substring(0, 70)}${roundtrip.length > 70 ? '...' : ''}`);
        console.log(`   Status: ✓ Success\n`);
    } catch (error) {
        console.log(`   Error: ${error.message}\n`);
    }
});

console.log('=== Complex Aromatic Structures ===\n');

const aromatics = [
    { name: 'Benzene', smiles: 'c1ccccc1' },
    { name: 'Naphthalene', smiles: 'c1ccc2ccccc2c1' },
    { name: 'Anthracene', smiles: 'c1ccc2cc3ccccc3cc2c1' },
    { name: 'Pyridine', smiles: 'c1ccncc1' },
    { name: 'Thiophene', smiles: 'c1ccsc1' },
    { name: 'Furan', smiles: 'c1ccoc1' },
    { name: 'Indole', smiles: 'c1ccc2c(c1)[nH]cc2' },
    { name: 'Quinoline', smiles: 'c1ccc2ncccc2c1' }
];

aromatics.forEach(mol => {
    const selfies = encoder(mol.smiles);
    const decoded = decoder(selfies);
    console.log(`${mol.name.padEnd(15)} ${mol.smiles.padEnd(20)} → ${selfies.substring(0, 40)}...`);
});

console.log('\n=== Stereochemistry Examples ===\n');

const stereo = [
    { name: 'L-Alanine', smiles: 'C[C@H](N)C(=O)O' },
    { name: 'D-Alanine', smiles: 'C[C@@H](N)C(=O)O' },
    { name: '(R)-Limonene', smiles: 'CC(=C)C1CC=C(C)CC1' },
    { name: 'Cis-2-butene', smiles: 'C/C=C\\C' },
    { name: 'Trans-2-butene', smiles: 'C/C=C/C' }
];

stereo.forEach(mol => {
    const selfies = encoder(mol.smiles);
    console.log(`${mol.name.padEnd(20)} ${mol.smiles.padEnd(20)} → ${selfies}`);
});

console.log('\n=== Multiple Fragments ===\n');

const fragments = encoder('CCO.C=O.c1ccccc1');
console.log('SMILES:', 'CCO.C=O.c1ccccc1');
console.log('SELFIES:', fragments);
console.log('Decoded:', decoder(fragments));
