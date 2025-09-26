import { render } from 'ink';
import { App, View } from './SingleHeaderApp.js';

// Keep track of whether TUI is already running
let isRunning = false;
let currentApp: ReturnType<typeof render> | null = null;

export async function startTUI(initialView?: View) {
  // Prevent multiple instances
  if (isRunning) {
    console.error('TUI is already running');
    return;
  }

  // Check if we're in a TTY environment
  if (!process.stdout.isTTY) {
    console.error('Error: TUI requires an interactive terminal (TTY)');
    console.error('Try running this command directly in your terminal, not through a pipe or redirect.');
    process.exit(1);
  }

  isRunning = true;

  // Default to menu if no view specified
  const view = initialView || 'menu';

  // Clear the console before starting
  console.clear();

  // Cleanup handler to prevent EIO errors
  const cleanup = () => {
    if (currentApp) {
      currentApp.unmount();
      currentApp = null;
    }
    isRunning = false;
    // Remove event listeners to prevent duplication
    process.removeListener('SIGINT', cleanup);
    process.removeListener('SIGTERM', cleanup);
    // Give the terminal a moment to reset
    setTimeout(() => {
      process.exit(0);
    }, 50);
  };

  // Handle various exit signals (only if not already registered)
  process.once('SIGINT', cleanup);
  process.once('SIGTERM', cleanup);

  try {
    currentApp = render(<App initialView={view} />);
    await currentApp.waitUntilExit();
    cleanup();
  } catch (error) {
    if (error instanceof Error && error.message.includes('EIO')) {
      // Silently handle EIO errors on exit
      cleanup();
    } else {
      console.error('TUI Error:', error);
      cleanup();
      process.exit(1);
    }
  }
}

// If called directly
if (process.argv[1] && process.argv[1].endsWith('tui.js')) {
  // Get the view from command line arguments
  const view = process.argv[2] as View | undefined;
  startTUI(view).catch(error => {
    console.error('Failed to start TUI:', error);
    process.exit(1);
  });
}