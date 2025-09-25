import { render } from 'ink';
import { App, View } from './App.js';

export async function startTUI(initialView?: View) {
  // Check if we're in a TTY environment
  if (!process.stdout.isTTY) {
    console.error('Error: TUI requires an interactive terminal (TTY)');
    console.error('Try running this command directly in your terminal, not through a pipe or redirect.');
    process.exit(1);
  }

  // Default to menu if no view specified
  const view = initialView || 'menu';

  let app: ReturnType<typeof render> | null = null;

  // Cleanup handler to prevent EIO errors
  const cleanup = () => {
    if (app) {
      app.unmount();
      app = null;
    }
    // Give the terminal a moment to reset
    setTimeout(() => {
      process.exit(0);
    }, 50);
  };

  // Handle various exit signals
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', () => {
    if (app) {
      app.unmount();
    }
  });

  try {
    app = render(<App initialView={view} />);
    await app.waitUntilExit();
    cleanup();
  } catch (error) {
    if (error instanceof Error && error.message.includes('EIO')) {
      // Silently handle EIO errors on exit
      cleanup();
    } else {
      console.error('TUI Error:', error);
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