import React from 'react';
import { render as inkRender, RenderOptions } from 'ink-testing-library';
import { NotificationProvider } from '../hooks/useNotification.js';

/**
 * Custom render function that wraps components with necessary providers
 */
export const render = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <NotificationProvider>{children}</NotificationProvider>
  );

  return inkRender(ui, { wrapper: Wrapper, ...options });
};

/**
 * Mock implementation for filesystem operations
 */
export const mockFS = {
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  unlinkSync: jest.fn(),
};

/**
 * Mock OAuth client for testing
 */
export const mockOAuthClient = {
  authenticate: jest.fn(),
  refreshToken: jest.fn(),
  revokeToken: jest.fn(),
  getTokens: jest.fn(),
  clearTokens: jest.fn(),
  inspectToken: jest.fn(),
};

/**
 * Mock configuration loader
 */
export const mockConfigLoader = {
  load: jest.fn(),
  save: jest.fn(),
  validate: jest.fn(),
  getProviders: jest.fn(),
  testEndpoint: jest.fn(),
};

/**
 * Helper function to simulate key presses
 */
export const pressKey = (instance: any, key: string) => {
  const keyMap: Record<string, any> = {
    'escape': { escape: true },
    'enter': { return: true },
    'up': { upArrow: true },
    'down': { downArrow: true },
    'left': { leftArrow: true },
    'right': { rightArrow: true },
    'tab': { tab: true },
  };

  if (keyMap[key]) {
    instance.stdin.write('', keyMap[key]);
  } else if (key.startsWith('ctrl+')) {
    const char = key.split('+')[1];
    instance.stdin.write(char, { ctrl: true });
  } else {
    instance.stdin.write(key);
  }
};

/**
 * Helper to wait for async operations
 */
export const waitForAsync = (ms = 10) =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Mock token data for testing
 */
export const mockTokens = [
  {
    id: '1',
    provider: 'google',
    type: 'access_token',
    value: 'mock-access-token',
    expiresAt: new Date(Date.now() + 3600000),
    scopes: ['read', 'write'],
  },
  {
    id: '2',
    provider: 'github',
    type: 'refresh_token',
    value: 'mock-refresh-token',
    expiresAt: new Date(Date.now() + 86400000),
    scopes: ['repo'],
  },
];

/**
 * Mock provider configurations
 */
export const mockProviders = [
  {
    name: 'google',
    clientId: 'mock-client-id',
    clientSecret: 'mock-client-secret',
    authUrl: 'https://accounts.google.com/oauth/authorize',
    tokenUrl: 'https://accounts.google.com/oauth/token',
    scopes: ['openid', 'profile', 'email'],
  },
  {
    name: 'github',
    clientId: 'mock-github-client',
    clientSecret: 'mock-github-secret',
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scopes: ['repo', 'user'],
  },
];

/**
 * Mock JWT token for testing
 */
export const mockJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

/**
 * Helper to create mock component props
 */
export const createMockProps = (overrides = {}) => ({
  onSelect: jest.fn(),
  onCancel: jest.fn(),
  onComplete: jest.fn(),
  onBack: jest.fn(),
  hasConfig: true,
  ...overrides,
});

/**
 * Test environment setup
 */
export const setupTestEnvironment = () => {
  // Mock process.cwd()
  const originalCwd = process.cwd;
  process.cwd = jest.fn(() => '/test-dir');

  // Mock environment variables
  process.env.TOKEN_ENCRYPTION_KEY = 'test-encryption-key';

  return () => {
    process.cwd = originalCwd;
    delete process.env.TOKEN_ENCRYPTION_KEY;
  };
};