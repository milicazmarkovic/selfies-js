# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-02-15

### Added
- Full aromatic SMILES encoding with kekulization support
- Complete SMILES parser with tokenization and molecular graph representation
- CLI tool for command-line encoding and decoding
- Comprehensive validation on 133,885 molecules from 14 datasets
- Example files showing basic usage, ML encoding, and pharmaceutical molecules
- Attribution tracking for detailed SMILES to SELFIES token mapping

### Changed
- Encoder rewritten with complete SMILES parsing pipeline
- Bond dictionary uses directed keys for proper bond tracking
- Improved charge and hydrogen count parsing
- Updated validation metrics with larger test set
- Documentation improvements

### Fixed
- Ring bond insertion logic
- Stereochemistry markers now output numeric suffixes for consistency
- Aromatic atom recognition
- Charge parsing for various formats
- Hydrogen count encoding for explicit H counts
- E/Z ring stereochemistry support
- Ring bond stereo character ordering (alphabetically sorted)

### Validation
- Test coverage: 597,707 molecules from multiple chemical datasets
- Encoder success: 100% on valid molecules (597,420/597,707)
- Structure equivalence: 99.997% (597,404/597,420 successful encodings)
- Semantic constraints: 100% agreement (287 violations correctly identified)
- Decoder: 100% accuracy (identical to Python SELFIES v2.2.0)
- Exact SELFIES match: 69.6% (kekulization variants account for differences)

Note: The 30.4% of molecules with different SELFIES strings are due to kekulization variants in aromatic systems. Both implementations produce chemically equivalent structures, confirmed by the 99.997% structure equivalence rate.

## [1.0.0] - 2024-02-11

### Added
- Initial release
- Complete TypeScript implementation of SELFIES decoder
- Basic SMILES encoder for non-aromatic molecules
- Bond constraints management
- Molecular graph representation
- Grammar rules and state transitions
- Utility functions: lenSelfies(), splitSelfies(), getAlphabetFromSelfies()
- Machine learning utilities: label encoding, one-hot encoding
- Semantic constraints with presets (default, octet_rule, hypervalent)
- Object-oriented API via SELFIES class
- TypeScript type definitions

### Features
- Valid SELFIES decoding matching Python SELFIES v2.2.0
- Zero runtime dependencies
- Tree-shakeable ES modules
- Full TypeScript support

### Limitations
- Aromatic molecule encoding not yet supported
