import { render } from 'ink';
import { App } from './App.js';

export function startTUI(initialView?: 'dashboard' | 'auth' | 'tokens' | 'config' | 'inspect') {
  const { waitUntilExit } = render(<App initialView={initialView} />);
  return waitUntilExit();
}

// If called directly
if (process.argv[1] && process.argv[1].endsWith('tui.js')) {
  // Get the view from command line arguments
  const view = process.argv[2] as 'dashboard' | 'auth' | 'tokens' | 'config' | 'inspect' | undefined;
  startTUI(view);
}