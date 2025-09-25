import * as esbuild from 'esbuild';
import { readFileSync } from 'fs';

// Get package.json dependencies
const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
const dependencies = Object.keys(pkg.dependencies || {});

// Create a wrapper script that properly handles ESM
const buildOptions = {
  entryPoints: ['./src/cli/wrapper.mjs'],
  outfile: 'dist/cli.mjs',  // Use .mjs extension for explicit ESM
  bundle: false,  // Don't bundle, just copy
  platform: 'node',
  target: 'node18',
  sourcemap: false,
  format: 'esm',  // Use ES modules throughout
  minify: false,
  logLevel: 'info',
  external: [],
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