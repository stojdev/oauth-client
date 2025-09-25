import { logger } from '../../utils/Logger.js';

type TUIView = 'dashboard' | 'auth' | 'tokens' | 'config' | 'inspect';

export async function tuiCommand(options: { view?: string }): Promise<void> {
  try {
    // Dynamically import TUI to avoid bundling issues
    const { startTUI } = await import('../../tui/index.js');
    await startTUI(options.view as TUIView);
  } catch (error) {
    logger.error('Failed to start TUI:', error);
    process.exit(1);
  }
}
