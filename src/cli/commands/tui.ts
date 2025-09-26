import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../../utils/Logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function tuiCommand(options: { view?: string }): Promise<void> {
  try {
    // Check if Python TUI is available
    const pythonTuiPath = join(__dirname, '../../../python-tui');
    const venvPython = join(pythonTuiPath, 'venv', 'bin', 'python');

    if (existsSync(pythonTuiPath)) {
      // Try to use venv Python first, fallback to system python3
      const pythonExe = existsSync(venvPython) ? venvPython : 'python3';

      // Launch Python TUI
      const args = ['-m', 'oauth_tui'];
      if (options.view) {
        args.push('--view', options.view);
      }

      const child = spawn(pythonExe, args, {
        cwd: pythonTuiPath,
        stdio: 'inherit',
        env: { ...process.env, PYTHONPATH: pythonTuiPath },
      });

      return new Promise((resolve, reject) => {
        child.on('exit', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`TUI exited with code ${code}`));
          }
        });

        child.on('error', (err) => {
          reject(new Error(`Failed to start Python TUI: ${err.message}`));
        });
      });
    } else {
      logger.error('Python TUI not found. Please install it first:');
      logger.info('cd python-tui && python3 -m venv venv');
      logger.info('cd python-tui && ./venv/bin/pip install -e .');
      process.exit(1);
    }
  } catch (error) {
    logger.error('Failed to start TUI:', error);
    process.exit(1);
  }
}
