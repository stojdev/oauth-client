/**
 * Jest setup file specifically for TUI component testing
 */

import { jest } from '@jest/globals';

// Extend test timeout for TUI rendering
jest.setTimeout(15000);

// Mock terminal environment
process.stdout.isTTY = true;
process.stderr.isTTY = true;
process.stdin.isTTY = true;

// Mock terminal dimensions
Object.defineProperty(process.stdout, 'columns', {
  value: 80,
  writable: true,
});

Object.defineProperty(process.stdout, 'rows', {
  value: 24,
  writable: true,
});

// Mock process.exit to prevent tests from actually exiting
const originalExit = process.exit;
process.exit = jest.fn() as typeof process.exit;

// Cleanup function to restore original process.exit
afterAll(() => {
  process.exit = originalExit;
});

// Suppress console output during tests unless needed
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: originalConsole.warn,
  error: originalConsole.error,
} as Console;

// Mock React DevTools to prevent warnings
global.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
  isDisabled: true,
  supportsFiber: true,
  inject: () => {},
  onCommitFiberRoot: () => {},
  onCommitFiberUnmount: () => {},
};

// Mock performance API if not available
if (typeof global.performance === 'undefined') {
  global.performance = {
    now: () => Date.now(),
    mark: () => undefined,
    measure: () => undefined,
    getEntriesByName: () => [],
    getEntriesByType: () => [],
    clearMarks: () => undefined,
    clearMeasures: () => undefined,
  } as Performance;
}

// Mock clipboard API for testing
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn().mockResolvedValue(undefined),
    readText: jest.fn().mockResolvedValue(''),
  },
  writable: true,
});

// Mock file system operations
jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
  readFileSync: jest.fn(() => '{}'),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  unlinkSync: jest.fn(),
  readdirSync: jest.fn(() => []),
  statSync: jest.fn(() => ({
    isDirectory: () => false,
    isFile: () => true,
    size: 1024,
    mtime: new Date(),
  })),
}));

// Mock path operations
jest.mock('path', () => ({
  join: (...args: string[]) => args.join('/'),
  resolve: (...args: string[]) => '/' + args.join('/'),
  dirname: (p: string) => p.split('/').slice(0, -1).join('/'),
  basename: (p: string) => p.split('/').pop() || '',
  extname: (p: string) => {
    const parts = p.split('.');
    return parts.length > 1 ? '.' + parts.pop() : '';
  },
}));

// Mock crypto for encryption operations
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => '12345678-1234-5678-9012-123456789012',
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
    subtle: {
      encrypt: jest.fn(),
      decrypt: jest.fn(),
      importKey: jest.fn(),
      generateKey: jest.fn(),
    },
  },
  writable: true,
});

// Mock HTTP requests
global.fetch = jest.fn() as typeof fetch;

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
