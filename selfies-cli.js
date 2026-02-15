#!/usr/bin/env node
/**
 * Quick SELFIES encoder/decoder CLI tool
 * 
 * Usage:
 *   node selfies-cli.js encode "CCO"
 *   node selfies-cli.js decode "[C][C][O]"
 *   node selfies-cli.js "CCO"  (encodes and decodes)
 */

const selfies = require('./dist');

const args = process.argv.slice(2);

if (args.length === 0) {
    console.log('Usage:');
    console.log('  node selfies-cli.js encode "CCO"');
    console.log('  node selfies-cli.js decode "[C][C][O]"');
    console.log('  node selfies-cli.js "CCO"  (encode + decode roundtrip)');
    process.exit(0);
}

const command = args.length === 1 ? 'roundtrip' : args[0];
const input = args.length === 1 ? args[0] : args[1];

try {
    switch (command) {
        case 'encode':
        case 'e':
            const encoded = selfies.encoder(input);
            console.log(encoded);
            break;
            
        case 'decode':
        case 'd':
            const decoded = selfies.decoder(input);
            console.log(decoded);
            break;
            
        case 'roundtrip':
        case 'r':
        default:
            console.log('Input SMILES:', input);
            const selfiesStr = selfies.encoder(input);
            console.log('SELFIES:     ', selfiesStr);
            const roundtrip = selfies.decoder(selfiesStr);
            console.log('Roundtrip:   ', roundtrip);
            console.log('Match:       ', input === roundtrip ? '✓ YES' : '✗ NO');
            break;
    }
} catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
}
