#!/usr/bin/env node

// ESM launcher for the TUI to avoid CommonJS/ESM conflicts
import { startTUI } from './index.tsx';

// Get view from command line arguments
const view = process.argv[2];
startTUI(view);