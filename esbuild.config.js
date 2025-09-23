import * as esbuild from 'esbuild';

const buildOptions = {
  entryPoints: ['./src/index.ts', './src/cli/index.ts'],
  outdir: 'dist',
  bundle: true,
  platform: 'node',
  target: 'node18',
  sourcemap: true,
  format: 'esm',
  minify: process.env.NODE_ENV === 'production',
  logLevel: 'info',
  splitting: true,
  banner: {
    js: `import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
`,
  },
};

async function build() {
  try {
    if (process.argv.includes('--watch')) {
      const context = await esbuild.context({
        ...buildOptions,
        plugins: [
          {
            name: 'rebuild-notify',
            setup(build) {
              build.onEnd(result => {
                console.log('[esbuild] Build completed', new Date().toLocaleTimeString());
                if (result.errors.length > 0) {
                  console.error('[esbuild] Build failed with errors');
                }
              });
            },
          },
        ],
      });
      await context.watch();
      console.log('[esbuild] Watching for changes...');
    } else {
      await esbuild.build(buildOptions);
      console.log('[esbuild] Build completed successfully');
    }
  } catch (error) {
    console.error('[esbuild] Build failed:', error);
    process.exit(1);
  }
}

build();