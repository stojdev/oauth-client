import * as esbuild from 'esbuild';
import { readFileSync } from 'fs';

// Get package.json dependencies
const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
const dependencies = Object.keys(pkg.dependencies || {});

// Remove ESM-only packages from external list so they get bundled
const externalDeps = dependencies.filter(dep =>
  !['chalk', 'inquirer', 'clipboardy'].includes(dep)
);

const buildOptions = {
  entryPoints: ['./src/cli/index.ts'],
  outfile: 'dist/cli.cjs',
  bundle: true,
  platform: 'node',
  target: 'node18',
  sourcemap: true,
  format: 'cjs',  // Use CommonJS for the CLI to work with shebang
  minify: process.env.NODE_ENV === 'production',
  logLevel: 'info',
  // Only mark non-ESM dependencies as external
  external: externalDeps,
  banner: {
    js: '#!/usr/bin/env node',
  },
};

async function build() {
  try {
    await esbuild.build(buildOptions);
    console.log('[esbuild] CLI build completed successfully');
  } catch (error) {
    console.error('[esbuild] CLI build failed:', error);
    process.exit(1);
  }
}

build();