import { spawn } from 'child_process';
import path from 'path';
import { logger } from '../../utils/Logger.js';

export async function tuiCommand(options: { view?: string }): Promise<void> {
  try {
    // Run TUI as a separate ESM process to avoid CJS/ESM conflicts
    const currentDir = process.cwd();
    const tuiLauncherPath = path.join(currentDir, 'src', 'tui', 'launcher.mjs');

    const args = [tuiLauncherPath];
    if (options.view) {
      args.push(options.view);
    }

    // Use tsx to run TypeScript files directly
    const child = spawn('npx', ['tsx', ...args], {
      stdio: 'inherit',
      env: { ...process.env },
    });

    child.on('error', (error) => {
      logger.error('Failed to start TUI:', error);
      process.exit(1);
    });

    child.on('exit', (code) => {
      process.exit(code || 0);
    });
  } catch (error) {
    logger.error('Failed to start TUI:', error);
    process.exit(1);
  }
}
