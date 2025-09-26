import React from 'react';
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { render, pressKey, waitForAsync, mockOAuthClient, mockTokens, mockJWT, setupTestEnvironment } from './test-utils.js';
import { EnhancedTokenManager } from '../components/Token/EnhancedTokenManager.js';
import { TokenManager } from '../components/Token/TokenManager.js';
import { TokenRefresher } from '../components/Token/TokenRefresher.js';
import { TokenInspector } from '../components/Inspector/TokenInspector.js';
import { JWTInspector } from '../components/Inspector/JWTInspector.js';

// Mock token manager and JWT decoder
jest.mock('../../../core/TokenManager.js', () => ({
  TokenManager: jest.fn().mockImplementation(() => ({
    getTokens: jest.fn().mockResolvedValue(mockTokens),
    deleteToken: jest.fn().mockResolvedValue(true),
    refreshToken: jest.fn().mockResolvedValue({
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
    }),
    clearAllTokens: jest.fn().mockResolvedValue(true),
    exportTokens: jest.fn().mockResolvedValue('exported-data'),
    importTokens: jest.fn().mockResolvedValue(true),
  })),
}));

jest.mock('../../../utils/JWTDecoder.js', () => ({
  JWTDecoder: {
    decode: jest.fn().mockReturnValue({
      header: { alg: 'HS256', typ: 'JWT' },
      payload: { sub: '1234567890', name: 'John Doe', iat: 1516239022 },
      signature: 'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    }),
    verify: jest.fn().mockReturnValue(true),
    isExpired: jest.fn().mockReturnValue(false),
  },
}));

jest.mock('../../../utils/Clipboard.js', () => ({
  copyToClipboard: jest.fn().mockResolvedValue(true),
}));

describe('Token Management Tests', () => {
  let cleanup: () => void;

  beforeEach(() => {
    cleanup = setupTestEnvironment();
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('EnhancedTokenManager Component', () => {
    test('should render token list', async () => {
      const { lastFrame } = render(<EnhancedTokenManager />);

      await waitForAsync(100);
      expect(lastFrame()).toContain('Token Manager') ||
      expect(lastFrame()).toContain('Tokens');
    });

    test('should display token information', async () => {
      const instance = render(<EnhancedTokenManager />);

      await waitForAsync(100);

      const frame = instance.lastFrame();
      expect(frame).toContain('google') ||
      expect(frame).toContain('github') ||
      expect(frame).toContain('access_token');
    });

    test('should handle token selection', async () => {
      const instance = render(<EnhancedTokenManager />);

      await waitForAsync(100);

      // Navigate through tokens
      pressKey(instance, 'down');
      pressKey(instance, 'up');

      expect(instance.lastFrame()).toContain('▶') ||
      expect(instance.lastFrame()).toContain('selected');
    });

    test('should delete selected token', async () => {
      const TokenManager = require('../../../core/TokenManager.js').TokenManager;
      const tokenManager = new TokenManager();

      const instance = render(<EnhancedTokenManager />);

      await waitForAsync(100);

      // Delete first token
      pressKey(instance, 'd');
      await waitForAsync(50);

      expect(tokenManager.deleteToken).toHaveBeenCalled();
    });

    test('should refresh expired tokens', async () => {
      const TokenManager = require('../../../core/TokenManager.js').TokenManager;
      const tokenManager = new TokenManager();

      const instance = render(<EnhancedTokenManager />);

      await waitForAsync(100);

      // Refresh token
      pressKey(instance, 'r');
      await waitForAsync(50);

      expect(tokenManager.refreshToken).toHaveBeenCalled();
    });

    test('should export tokens', async () => {
      const TokenManager = require('../../../core/TokenManager.js').TokenManager;
      const tokenManager = new TokenManager();

      const instance = render(<EnhancedTokenManager />);

      await waitForAsync(100);

      // Export tokens
      pressKey(instance, 'e');
      await waitForAsync(50);

      expect(tokenManager.exportTokens).toHaveBeenCalled();
    });

    test('should import tokens', async () => {
      const TokenManager = require('../../../core/TokenManager.js').TokenManager;
      const tokenManager = new TokenManager();

      const instance = render(<EnhancedTokenManager />);

      await waitForAsync(100);

      // Import tokens
      pressKey(instance, 'i');
      await waitForAsync(50);

      expect(tokenManager.importTokens).toHaveBeenCalled() ||
      expect(instance.lastFrame()).toContain('import');
    });

    test('should clear all tokens with confirmation', async () => {
      const TokenManager = require('../../../core/TokenManager.js').TokenManager;
      const tokenManager = new TokenManager();

      const instance = render(<EnhancedTokenManager />);

      await waitForAsync(100);

      // Clear all tokens
      pressKey(instance, 'c');
      await waitForAsync(50);

      // Confirm deletion
      pressKey(instance, 'y');
      await waitForAsync(50);

      expect(tokenManager.clearAllTokens).toHaveBeenCalled();
    });

    test('should show token details', async () => {
      const instance = render(<EnhancedTokenManager />);

      await waitForAsync(100);

      // View token details
      pressKey(instance, 'enter');
      await waitForAsync(50);

      expect(instance.lastFrame()).toContain('Details') ||
      expect(instance.lastFrame()).toContain('Token Info');
    });

    test('should copy token to clipboard', async () => {
      const { copyToClipboard } = require('../../../utils/Clipboard.js');

      const instance = render(<EnhancedTokenManager />);

      await waitForAsync(100);

      // Copy token
      pressKey(instance, 'ctrl+c');
      await waitForAsync(50);

      expect(copyToClipboard).toHaveBeenCalled();
    });
  });

  describe('TokenManager Component', () => {
    test('should render basic token manager', async () => {
      const { lastFrame } = render(<TokenManager />);

      await waitForAsync(100);
      expect(lastFrame()).toContain('Token') ||
      expect(lastFrame()).toContain('Manager');
    });

    test('should handle empty token list', async () => {
      const TokenManagerClass = require('../../../core/TokenManager.js').TokenManager;
      const tokenManager = new TokenManagerClass();
      tokenManager.getTokens.mockResolvedValue([]);

      const { lastFrame } = render(<TokenManager />);

      await waitForAsync(100);
      expect(lastFrame()).toContain('No tokens') ||
      expect(lastFrame()).toContain('empty');
    });

    test('should show token expiry status', async () => {
      const expiredToken = {
        ...mockTokens[0],
        expiresAt: new Date(Date.now() - 3600000), // Expired 1 hour ago
      };

      const TokenManagerClass = require('../../../core/TokenManager.js').TokenManager;
      const tokenManager = new TokenManagerClass();
      tokenManager.getTokens.mockResolvedValue([expiredToken]);

      const { lastFrame } = render(<TokenManager />);

      await waitForAsync(100);
      expect(lastFrame()).toContain('expired') ||
      expect(lastFrame()).toContain('Expired');
    });
  });

  describe('TokenRefresher Component', () => {
    test('should render token refresher interface', () => {
      const props = {
        tokens: mockTokens,
        onRefresh: jest.fn(),
        onCancel: jest.fn(),
      };

      const { lastFrame } = render(<TokenRefresher {...props} />);

      expect(lastFrame()).toContain('Refresh') ||
      expect(lastFrame()).toContain('refresh');
    });

    test('should select tokens for refresh', () => {
      const props = {
        tokens: mockTokens,
        onRefresh: jest.fn(),
        onCancel: jest.fn(),
      };

      const instance = render(<TokenRefresher {...props} />);

      // Select first token
      pressKey(instance, 'space');
      expect(instance.lastFrame()).toContain('✓') ||
      expect(instance.lastFrame()).toContain('selected');
    });

    test('should refresh selected tokens', async () => {
      const props = {
        tokens: mockTokens,
        onRefresh: jest.fn(),
        onCancel: jest.fn(),
      };

      const instance = render(<TokenRefresher {...props} />);

      // Select token and refresh
      pressKey(instance, 'space');
      pressKey(instance, 'enter');

      await waitForAsync(50);
      expect(props.onRefresh).toHaveBeenCalled();
    });

    test('should handle refresh errors', async () => {
      const props = {
        tokens: mockTokens,
        onRefresh: jest.fn().mockRejectedValue(new Error('Refresh failed')),
        onCancel: jest.fn(),
      };

      const instance = render(<TokenRefresher {...props} />);

      pressKey(instance, 'space');
      pressKey(instance, 'enter');

      await waitForAsync(100);
      expect(instance.lastFrame()).toContain('Error') ||
      expect(instance.lastFrame()).toContain('failed');
    });
  });

  describe('TokenInspector Component', () => {
    test('should render token inspector', () => {
      const { lastFrame } = render(<TokenInspector />);

      expect(lastFrame()).toContain('Inspector') ||
      expect(lastFrame()).toContain('Inspect');
    });

    test('should accept token input', () => {
      const instance = render(<TokenInspector />);

      // Type JWT token
      instance.stdin.write(mockJWT);

      expect(instance.lastFrame()).toContain('JWT') ||
      expect(instance.lastFrame()).toContain('token');
    });

    test('should decode and display JWT', async () => {
      const instance = render(<TokenInspector />);

      // Enter JWT token
      instance.stdin.write(mockJWT);
      pressKey(instance, 'enter');

      await waitForAsync(50);

      expect(instance.lastFrame()).toContain('Header') ||
      expect(instance.lastFrame()).toContain('Payload') ||
      expect(instance.lastFrame()).toContain('John Doe');
    });

    test('should show token validation status', async () => {
      const { JWTDecoder } = require('../../../utils/JWTDecoder.js');
      JWTDecoder.verify.mockReturnValue(true);

      const instance = render(<TokenInspector />);

      instance.stdin.write(mockJWT);
      pressKey(instance, 'enter');

      await waitForAsync(50);

      expect(instance.lastFrame()).toContain('Valid') ||
      expect(instance.lastFrame()).toContain('✓');
    });

    test('should handle invalid tokens', async () => {
      const { JWTDecoder } = require('../../../utils/JWTDecoder.js');
      JWTDecoder.decode.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const instance = render(<TokenInspector />);

      instance.stdin.write('invalid-token');
      pressKey(instance, 'enter');

      await waitForAsync(50);

      expect(instance.lastFrame()).toContain('Invalid') ||
      expect(instance.lastFrame()).toContain('Error');
    });
  });

  describe('JWTInspector Component', () => {
    test('should render JWT inspector with token', () => {
      const props = { token: mockJWT };
      const { lastFrame } = render(<JWTInspector {...props} />);

      expect(lastFrame()).toContain('JWT') ||
      expect(lastFrame()).toContain('Header');
    });

    test('should display JWT header information', () => {
      const props = { token: mockJWT };
      const { lastFrame } = render(<JWTInspector {...props} />);

      expect(lastFrame()).toContain('HS256') ||
      expect(lastFrame()).toContain('JWT');
    });

    test('should display JWT payload information', () => {
      const props = { token: mockJWT };
      const { lastFrame } = render(<JWTInspector {...props} />);

      expect(lastFrame()).toContain('John Doe') ||
      expect(lastFrame()).toContain('1234567890');
    });

    test('should show expiration information', () => {
      const props = { token: mockJWT };
      const { lastFrame } = render(<JWTInspector {...props} />);

      expect(lastFrame()).toContain('exp') ||
      expect(lastFrame()).toContain('Expires') ||
      expect(lastFrame()).toContain('iat');
    });

    test('should handle expired tokens', () => {
      const { JWTDecoder } = require('../../../utils/JWTDecoder.js');
      JWTDecoder.isExpired.mockReturnValue(true);

      const props = { token: mockJWT };
      const { lastFrame } = render(<JWTInspector {...props} />);

      expect(lastFrame()).toContain('expired') ||
      expect(lastFrame()).toContain('Expired');
    });

    test('should copy JWT parts to clipboard', async () => {
      const { copyToClipboard } = require('../../../utils/Clipboard.js');
      const props = { token: mockJWT };

      const instance = render(<JWTInspector {...props} />);

      // Copy header
      pressKey(instance, 'h');
      await waitForAsync(50);

      expect(copyToClipboard).toHaveBeenCalled();
    });
  });

  describe('Token Integration Tests', () => {
    test('should handle token lifecycle', async () => {
      const TokenManagerClass = require('../../../core/TokenManager.js').TokenManager;
      const tokenManager = new TokenManagerClass();

      const instance = render(<EnhancedTokenManager />);

      await waitForAsync(100);

      // View token
      pressKey(instance, 'enter');
      await waitForAsync(50);

      // Refresh token
      pressKey(instance, 'escape');
      pressKey(instance, 'r');
      await waitForAsync(50);

      // Delete token
      pressKey(instance, 'd');
      await waitForAsync(50);

      expect(tokenManager.getTokens).toHaveBeenCalled();
      expect(tokenManager.refreshToken).toHaveBeenCalled();
      expect(tokenManager.deleteToken).toHaveBeenCalled();
    });

    test('should maintain token list state', async () => {
      const instance = render(<EnhancedTokenManager />);

      await waitForAsync(100);

      // Navigate through tokens
      pressKey(instance, 'down');
      pressKey(instance, 'down');
      pressKey(instance, 'up');

      // State should be maintained
      expect(instance.lastFrame()).toContain('▶') ||
      expect(instance.lastFrame()).toContain('selected');
    });

    test('should handle concurrent token operations', async () => {
      const TokenManagerClass = require('../../../core/TokenManager.js').TokenManager;
      const tokenManager = new TokenManagerClass();

      const instance = render(<EnhancedTokenManager />);

      await waitForAsync(100);

      // Perform multiple operations
      pressKey(instance, 'r'); // Refresh
      pressKey(instance, 'e'); // Export
      pressKey(instance, 'd'); // Delete

      await waitForAsync(100);

      // All operations should be handled
      expect(tokenManager.refreshToken).toHaveBeenCalled() ||
      expect(tokenManager.exportTokens).toHaveBeenCalled() ||
      expect(tokenManager.deleteToken).toHaveBeenCalled();
    });

    test('should handle token search and filtering', async () => {
      const instance = render(<EnhancedTokenManager />);

      await waitForAsync(100);

      // Open search
      pressKey(instance, '/');
      await waitForAsync(50);

      // Type search query
      instance.stdin.write('google');
      pressKey(instance, 'enter');

      await waitForAsync(50);

      expect(instance.lastFrame()).toContain('google') ||
      expect(instance.lastFrame()).toContain('Search');
    });
  });
});