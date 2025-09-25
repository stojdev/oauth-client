import { logger } from '../../utils/Logger.js';
import type { View } from '../../tui/App.js';

export async function tuiCommand(options: { view?: string }): Promise<void> {
  try {
    // With ESM, we can directly import the TUI
    const { startTUI } = await import('../../tui/index.js');
    // Default to menu if no view specified
    const view = (options.view || 'menu') as View;
    await startTUI(view);
  } catch (error) {
    logger.error('Failed to start TUI:', error);
    process.exit(1);
  }
}
