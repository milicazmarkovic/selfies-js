/**
 * Example: Using SELFIES-JS in a VS Code extension
 */

// This is a template for how to use SELFIES-JS in a VS Code extension

/*
import * as vscode from 'vscode';
import { decoder, encoder, getAlphabetFromSelfies, SELFIES } from 'selfies-js';

export function activate(context: vscode.ExtensionContext) {

  // Command 1: Convert selected SELFIES to SMILES
  const selfiesToSmilesCmd = vscode.commands.registerCommand(
    'selfies.toSmiles',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active editor');
        return;
      }

      const selection = editor.document.getText(editor.selection);
      if (!selection) {
        vscode.window.showWarningMessage('No text selected');
        return;
      }

      try {
        const smiles = decoder(selection.trim());
        vscode.window.showInformationMessage(`SMILES: ${smiles}`);
        
        // Optionally, insert result
        const shouldInsert = await vscode.window.showQuickPick(['Yes', 'No'], {
          placeHolder: 'Insert SMILES into document?'
        });
        
        if (shouldInsert === 'Yes') {
          editor.edit(editBuilder => {
            editBuilder.insert(editor.selection.end, `\n// SMILES: ${smiles}`);
          });
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Error: ${error.message}`);
      }
    }
  );

  // Command 2: Convert selected SMILES to SELFIES
  const smilesToSelfiesCmd = vscode.commands.registerCommand(
    'selfies.fromSmiles',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const selection = editor.document.getText(editor.selection);
      if (!selection) return;

      try {
        const selfies = encoder(selection.trim());
        vscode.window.showInformationMessage(`SELFIES: ${selfies}`);
        
        // Insert result
        editor.edit(editBuilder => {
          editBuilder.insert(editor.selection.end, `\n// SELFIES: ${selfies}`);
        });
      } catch (error) {
        vscode.window.showErrorMessage(`Error: ${error.message}`);
      }
    }
  );

  // Command 3: Show SELFIES info
  const showInfoCmd = vscode.commands.registerCommand(
    'selfies.showInfo',
    () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const selection = editor.document.getText(editor.selection);
      if (!selection) return;

      try {
        const mol = new SELFIES(selection.trim());
        const info = [
          `SELFIES: ${mol.toString()}`,
          `Length: ${mol.length} symbols`,
          `Symbols: ${mol.split().join(', ')}`,
          `SMILES: ${mol.toSmiles()}`
        ].join('\n');

        vscode.window.showInformationMessage(info, { modal: true });
      } catch (error) {
        vscode.window.showErrorMessage(`Error: ${error.message}`);
      }
    }
  );

  // Command 4: Extract alphabet from open file
  const extractAlphabetCmd = vscode.commands.registerCommand(
    'selfies.extractAlphabet',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const document = editor.document;
      const text = document.getText();
      
      // Extract SELFIES strings (assumes one per line)
      const lines = text.split('\n');
      const selfiesStrings = lines
        .map(line => line.trim())
        .filter(line => line.startsWith('[') && line.includes(']'));

      if (selfiesStrings.length === 0) {
        vscode.window.showWarningMessage('No SELFIES strings found');
        return;
      }

      const alphabet = getAlphabetFromSelfies(selfiesStrings);
      const alphabetArray = Array.from(alphabet).sort();
      
      // Show in new document
      const newDoc = await vscode.workspace.openTextDocument({
        content: `// Alphabet extracted from ${selfiesStrings.length} SELFIES strings\n` +
                 `// Total unique symbols: ${alphabet.size}\n\n` +
                 JSON.stringify(alphabetArray, null, 2),
        language: 'json'
      });
      
      await vscode.window.showTextDocument(newDoc);
    }
  );

  // Register all commands
  context.subscriptions.push(
    selfiesToSmilesCmd,
    smilesToSelfiesCmd,
    showInfoCmd,
    extractAlphabetCmd
  );

  // Hover provider for SELFIES strings
  const hoverProvider = vscode.languages.registerHoverProvider(
    { scheme: 'file', pattern: '**\/*.{txt,selfies,smi,smiles}' },
    {
      provideHover(document, position) {
        const range = document.getWordRangeAtPosition(position, /\[.*?\]/);
        if (!range) return;

        const word = document.getText(range);
        
        try {
          // Check if it's a valid SELFIES symbol
          const testSelfies = word;
          const smiles = decoder(testSelfies);
          
          const markdown = new vscode.MarkdownString();
          markdown.appendMarkdown(`**SELFIES Symbol**\n\n`);
          markdown.appendCodeblock(word, 'selfies');
          markdown.appendMarkdown(`Contributes to SMILES: \`${smiles}\``);
          
          return new vscode.Hover(markdown);
        } catch {
          return undefined;
        }
      }
    }
  );

  context.subscriptions.push(hoverProvider);
}

export function deactivate() {}
*/

// To use this in a VS Code extension:
// 1. Create a new VS Code extension project
// 2. Install selfies-js: npm install selfies-js
// 3. Copy this code to your extension.ts
// 4. Add commands to package.json:
/*
"contributes": {
  "commands": [
    {
      "command": "selfies.toSmiles",
      "title": "SELFIES: Convert to SMILES"
    },
    {
      "command": "selfies.fromSmiles",
      "title": "SELFIES: Convert from SMILES"
    },
    {
      "command": "selfies.showInfo",
      "title": "SELFIES: Show Info"
    },
    {
      "command": "selfies.extractAlphabet",
      "title": "SELFIES: Extract Alphabet"
    }
  ]
}
*/

export const VSCODE_EXTENSION_TEMPLATE = `
This file contains a template for integrating SELFIES-JS into a VS Code extension.

Key features:
- Convert SELFIES ↔ SMILES with commands
- Hover provider showing SELFIES info
- Alphabet extraction from datasets
- Interactive molecule information display

See comments in the file for full implementation details.
`;
