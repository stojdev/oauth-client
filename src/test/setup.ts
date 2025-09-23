// Jest setup file for global test configuration
// Add any global test setup here

import { jest } from '@jest/globals';

// Extend Jest matchers if needed
// import '@testing-library/jest-dom';

// Set longer timeout for integration tests if needed
jest.setTimeout(10000);

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  // Keep warn and error for visibility
  warn: console.warn,
  error: console.error,
} as Console;
