import * as esbuild from 'esbuild';

const buildOptions = {
  entryPoints: ['./src/tui/index.tsx'],
  outfile: 'dist/tui.js',
  bundle: true,
  platform: 'node',
  target: 'node18',
  sourcemap: true,
  format: 'esm',  // Use ESM for TUI to support top-level await
  minify: process.env.NODE_ENV === 'production',
  logLevel: 'info',
  external: [],  // Bundle everything to avoid runtime issues
};

async function build() {
  try {
    await esbuild.build(buildOptions);
    console.log('[esbuild] TUI build completed successfully');
  } catch (error) {
    console.error('[esbuild] TUI build failed:', error);
    process.exit(1);
  }
}

build();