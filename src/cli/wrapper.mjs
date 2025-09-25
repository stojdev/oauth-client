// ESM wrapper to run the TypeScript CLI
// This uses tsx to handle TypeScript and mixed module imports properly

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the actual CLI TypeScript file
const cliPath = join(__dirname, '..', 'src', 'cli', 'index.ts');

// Run the CLI using tsx which handles ESM/CJS interop properly
const child = spawn('npx', ['tsx', cliPath, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code) => {
  process.exit(code || 0);
});

child.on('error', (error) => {
  console.error('Failed to start CLI:', error);
  process.exit(1);
});