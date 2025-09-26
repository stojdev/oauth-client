import React from 'react';
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { render, pressKey, waitForAsync, mockOAuthClient, mockTokens, mockProviders, setupTestEnvironment } from './test-utils.js';
import { App } from '../App.js';

// Mock all external dependencies
jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

jest.mock('../../../core/OAuthClient.js', () => ({
  OAuthClient: jest.fn().mockImplementation(() => mockOAuthClient),
}));

jest.mock('../../../core/TokenManager.js', () => ({
  TokenManager: jest.fn().mockImplementation(() => ({
    getTokens: jest.fn().mockResolvedValue(mockTokens),
    deleteToken: jest.fn().mockResolvedValue(true),
    refreshToken: jest.fn().mockResolvedValue({
      access_token: 'new-token',
      refresh_token: 'new-refresh',
    }),
    clearAllTokens: jest.fn().mockResolvedValue(true),
    exportTokens: jest.fn().mockResolvedValue('exported-data'),
    importTokens: jest.fn().mockResolvedValue(true),
  })),
}));

jest.mock('../../../providers/ProviderConfig.js', () => ({
  ProviderConfigManager: jest.fn().mockImplementation(() => ({
    loadProviders: jest.fn().mockResolvedValue(mockProviders),
    saveProvider: jest.fn().mockResolvedValue(true),
    deleteProvider: jest.fn().mockResolvedValue(true),
    validateProvider: jest.fn().mockResolvedValue({ valid: true }),
    testEndpoint: jest.fn().mockResolvedValue({ status: 200, data: 'OK' }),
    exportConfig: jest.fn().mockResolvedValue('config-export'),
    importConfig: jest.fn().mockResolvedValue(true),
  })),
}));

jest.mock('../../../providers/DiscoveryClient.js', () => ({
  DiscoveryClient: jest.fn().mockImplementation(() => ({
    discover: jest.fn().mockResolvedValue({
      authorization_endpoint: 'https://example.com/auth',
      token_endpoint: 'https://example.com/token',
    }),
  })),
}));

jest.mock('../../../utils/JWTDecoder.js', () => ({
  JWTDecoder: {
    decode: jest.fn().mockReturnValue({
      header: { alg: 'HS256', typ: 'JWT' },
      payload: { sub: '12345', name: 'Test User', exp: Math.floor(Date.now() / 1000) + 3600 },
    }),
    verify: jest.fn().mockReturnValue(true),
    isExpired: jest.fn().mockReturnValue(false),
  },
}));

describe('TUI Integration Tests', () => {
  let cleanup: () => void;

  beforeEach(() => {
    cleanup = setupTestEnvironment();
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Complete User Workflows', () => {
    test('should complete full authentication workflow', async () => {
      mockOAuthClient.authenticate.mockResolvedValue({
        access_token: 'test-token',
        token_type: 'Bearer',
        expires_in: 3600,
      });

      const instance = render(<App />);

      await waitForAsync(100);

      // Navigate to authentication
      pressKey(instance, 'a');
      await waitForAsync(100);

      // Select provider (first in list)
      pressKey(instance, 'enter');
      await waitForAsync(50);

      // Select flow (first in list)
      pressKey(instance, 'enter');
      await waitForAsync(100);

      // Should complete authentication
      expect(mockOAuthClient.authenticate).toHaveBeenCalled();
      expect(instance.lastFrame()).toContain('Success') ||
      expect(instance.lastFrame()).toContain('Dashboard') ||
      expect(instance.lastFrame()).toContain('Complete');
    });

    test('should complete configuration management workflow', async () => {
      const ProviderConfigManager = require('../../../providers/ProviderConfig.js').ProviderConfigManager;
      const configManager = new ProviderConfigManager();

      const instance = render(<App />);

      await waitForAsync(100);

      // Navigate to configuration
      pressKey(instance, 'c');
      await waitForAsync(100);

      // Create new provider
      pressKey(instance, 'n');
      await waitForAsync(50);

      // Fill provider details (simulate form completion)
      pressKey(instance, 'tab');
      pressKey(instance, 'tab');
      pressKey(instance, 'enter'); // Save
      await waitForAsync(50);

      // Test configuration
      pressKey(instance, 'escape');
      pressKey(instance, 't');
      await waitForAsync(50);

      expect(configManager.saveProvider).toHaveBeenCalled();
      expect(configManager.testEndpoint).toHaveBeenCalled();
    });

    test('should complete token management workflow', async () => {
      const TokenManager = require('../../../core/TokenManager.js').TokenManager;
      const tokenManager = new TokenManager();

      const instance = render(<App />);

      await waitForAsync(100);

      // Navigate to token management
      pressKey(instance, 't');
      await waitForAsync(100);

      // Refresh first token
      pressKey(instance, 'r');
      await waitForAsync(50);

      // Delete a token
      pressKey(instance, 'd');
      await waitForAsync(50);

      // Export tokens
      pressKey(instance, 'e');
      await waitForAsync(50);

      expect(tokenManager.refreshToken).toHaveBeenCalled();
      expect(tokenManager.deleteToken).toHaveBeenCalled();
      expect(tokenManager.exportTokens).toHaveBeenCalled();
    });

    test('should complete token inspection workflow', async () => {
      const instance = render(<App />);

      await waitForAsync(100);

      // Navigate to token inspector
      pressKey(instance, 'i');
      await waitForAsync(100);

      // Enter JWT token
      const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      instance.stdin.write(jwt);
      pressKey(instance, 'enter');
      await waitForAsync(50);

      // Should display JWT information
      expect(instance.lastFrame()).toContain('Header') ||
      expect(instance.lastFrame()).toContain('Payload') ||
      expect(instance.lastFrame()).toContain('HS256');
    });
  });

  describe('Cross-Component Communication', () => {
    test('should share state between authentication and dashboard', async () => {
      mockOAuthClient.authenticate.mockResolvedValue({
        access_token: 'test-token',
      });

      const instance = render(<App />);

      await waitForAsync(100);

      // Complete authentication
      pressKey(instance, 'a');
      await waitForAsync(100);
      pressKey(instance, 'enter'); // Provider
      await waitForAsync(50);
      pressKey(instance, 'enter'); // Flow
      await waitForAsync(100);

      // Should redirect to dashboard and show authenticated state
      expect(instance.lastFrame()).toContain('Dashboard') ||
      expect(instance.lastFrame()).toContain('authenticated');
    });

    test('should update token list after authentication', async () => {
      const TokenManager = require('../../../core/TokenManager.js').TokenManager;
      const tokenManager = new TokenManager();

      mockOAuthClient.authenticate.mockResolvedValue({
        access_token: 'new-token',
      });

      const instance = render(<App />);

      await waitForAsync(100);

      // Authenticate
      pressKey(instance, 'a');
      await waitForAsync(100);
      pressKey(instance, 'enter');
      await waitForAsync(50);
      pressKey(instance, 'enter');
      await waitForAsync(100);

      // Navigate to tokens
      pressKey(instance, 'ctrl+t');
      await waitForAsync(100);

      // Should refresh token list
      expect(tokenManager.getTokens).toHaveBeenCalled();
    });

    test('should reflect configuration changes in authentication', async () => {
      const ProviderConfigManager = require('../../../providers/ProviderConfig.js').ProviderConfigManager;
      const configManager = new ProviderConfigManager();

      const instance = render(<App />);

      await waitForAsync(100);

      // Create new provider configuration
      pressKey(instance, 'c');
      await waitForAsync(100);
      pressKey(instance, 'n');
      await waitForAsync(50);

      // Save configuration
      pressKey(instance, 'tab');
      pressKey(instance, 'tab');
      pressKey(instance, 'enter');
      await waitForAsync(50);

      // Navigate to authentication
      pressKey(instance, 'escape');
      pressKey(instance, 'ctrl+a');
      await waitForAsync(100);

      // Should show updated provider list
      expect(configManager.loadProviders).toHaveBeenCalled();
    });
  });

  describe('Error Recovery Workflows', () => {
    test('should recover from authentication failure', async () => {
      mockOAuthClient.authenticate.mockRejectedValueOnce(new Error('Auth failed'))
                                  .mockResolvedValueOnce({ access_token: 'success-token' });

      const instance = render(<App />);

      await waitForAsync(100);

      // First authentication attempt (fails)
      pressKey(instance, 'a');
      await waitForAsync(100);
      pressKey(instance, 'enter');
      await waitForAsync(50);
      pressKey(instance, 'enter');
      await waitForAsync(100);

      // Should show error
      expect(instance.lastFrame()).toContain('Error') ||
      expect(instance.lastFrame()).toContain('failed');

      // Retry authentication
      pressKey(instance, 'r'); // Retry
      await waitForAsync(100);

      // Should succeed on retry
      expect(mockOAuthClient.authenticate).toHaveBeenCalledTimes(2);
    });

    test('should recover from network connectivity issues', async () => {
      const TokenManager = require('../../../core/TokenManager.js').TokenManager;
      const tokenManager = new TokenManager();

      tokenManager.getTokens.mockRejectedValueOnce(new Error('Network error'))
                            .mockResolvedValueOnce(mockTokens);

      const instance = render(<App />);

      await waitForAsync(100);

      // Try to access tokens (fails first time)
      pressKey(instance, 't');
      await waitForAsync(100);

      // Should show error
      expect(instance.lastFrame()).toContain('Error') ||
      expect(instance.lastFrame()).toContain('Network');

      // Retry
      pressKey(instance, 'r'); // Refresh
      await waitForAsync(100);

      // Should recover and show tokens
      expect(tokenManager.getTokens).toHaveBeenCalledTimes(2);
    });

    test('should handle partial configuration corruption', async () => {
      const ProviderConfigManager = require('../../../providers/ProviderConfig.js').ProviderConfigManager;
      const configManager = new ProviderConfigManager();

      // Mock corrupted config that gets fixed
      configManager.loadProviders.mockResolvedValueOnce([
        { name: 'corrupted', /* missing required fields */ }
      ]).mockResolvedValueOnce(mockProviders);

      const instance = render(<App />);

      await waitForAsync(100);

      // Try to access config
      pressKey(instance, 'c');
      await waitForAsync(100);

      // Should handle corruption gracefully
      expect(instance.lastFrame()).toContain('Configuration') ||
      expect(instance.lastFrame()).toContain('Error');

      // Fix configuration
      pressKey(instance, 'n'); // New provider
      await waitForAsync(50);
      pressKey(instance, 'escape'); // Cancel
      pressKey(instance, 'r'); // Refresh
      await waitForAsync(100);

      // Should recover
      expect(configManager.loadProviders).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance Under Load', () => {
    test('should handle rapid navigation without lag', async () => {
      const instance = render(<App />);

      await waitForAsync(100);

      const startTime = performance.now();

      // Rapid navigation between views
      const navigationSequence = ['ctrl+d', 'ctrl+t', 'ctrl+c', 'ctrl+i', 'ctrl+m'];

      for (let round = 0; round < 10; round++) {
        for (const key of navigationSequence) {
          pressKey(instance, key);
          await waitForAsync(5);
        }
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should complete navigation within reasonable time
      expect(totalTime).toBeLessThan(1000);
      expect(instance.lastFrame()).toContain('Main Menu');
    });

    test('should handle multiple simultaneous operations', async () => {
      const TokenManager = require('../../../core/TokenManager.js').TokenManager;
      const ProviderConfigManager = require('../../../providers/ProviderConfig.js').ProviderConfigManager;

      const instance = render(<App />);

      await waitForAsync(100);

      // Start multiple operations simultaneously
      const operations = [
        () => { pressKey(instance, 't'); pressKey(instance, 'r'); }, // Refresh tokens
        () => { pressKey(instance, 'c'); pressKey(instance, 't'); }, // Test config
        () => { pressKey(instance, 'i'); }, // Inspect tokens
      ];

      // Execute all operations rapidly
      operations.forEach(op => op());
      await waitForAsync(200);

      // Should handle all operations
      expect(TokenManager).toHaveBeenCalled();
      expect(ProviderConfigManager).toHaveBeenCalled();
    });

    test('should maintain responsiveness during heavy operations', async () => {
      // Mock heavy operation
      const TokenManager = require('../../../core/TokenManager.js').TokenManager;
      const tokenManager = new TokenManager();
      tokenManager.exportTokens.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve('heavy-export'), 500))
      );

      const instance = render(<App />);

      await waitForAsync(100);

      // Start heavy operation
      pressKey(instance, 't');
      await waitForAsync(50);
      pressKey(instance, 'e'); // Export (heavy operation)

      // Should remain responsive during operation
      pressKey(instance, 'escape'); // Should still respond
      await waitForAsync(50);

      expect(instance.lastFrame()).toContain('Main Menu') ||
      expect(instance.lastFrame()).toContain('Token');
    });
  });

  describe('Data Consistency', () => {
    test('should maintain data consistency across views', async () => {
      const TokenManager = require('../../../core/TokenManager.js').TokenManager;
      const tokenManager = new TokenManager();

      const instance = render(<App />);

      await waitForAsync(100);

      // View tokens
      pressKey(instance, 't');
      await waitForAsync(100);

      const initialTokenCount = mockTokens.length;

      // Delete a token
      pressKey(instance, 'd');
      await waitForAsync(50);

      // Navigate away and back
      pressKey(instance, 'ctrl+d'); // Dashboard
      pressKey(instance, 'ctrl+t'); // Back to tokens

      await waitForAsync(100);

      // Should reflect deletion
      expect(tokenManager.deleteToken).toHaveBeenCalled();
      expect(tokenManager.getTokens).toHaveBeenCalledTimes(2); // Initial load + refresh
    });

    test('should synchronize authentication state', async () => {
      mockOAuthClient.authenticate.mockResolvedValue({
        access_token: 'test-token',
      });

      const instance = render(<App />);

      await waitForAsync(100);

      // Authenticate
      pressKey(instance, 'a');
      await waitForAsync(100);
      pressKey(instance, 'enter');
      await waitForAsync(50);
      pressKey(instance, 'enter');
      await waitForAsync(100);

      // Check dashboard shows authenticated state
      pressKey(instance, 'ctrl+d');
      await waitForAsync(100);

      expect(instance.lastFrame()).toContain('Dashboard') ||
      expect(instance.lastFrame()).toContain('authenticated');

      // Check tokens view shows new token
      pressKey(instance, 'ctrl+t');
      await waitForAsync(100);

      expect(instance.lastFrame()).toContain('Token');
    });
  });

  describe('User Experience Flows', () => {
    test('should provide smooth onboarding flow for new users', async () => {
      // Mock no configuration exists
      const fs = require('fs');
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const instance = render(<App />);

      await waitForAsync(100);

      // Should show configuration warning
      expect(instance.lastFrame()).toContain('No configuration found');

      // Navigate to configuration
      pressKey(instance, 'c');
      await waitForAsync(100);

      // Should guide user to create configuration
      expect(instance.lastFrame()).toContain('Configuration') ||
      expect(instance.lastFrame()).toContain('Create');
    });

    test('should handle expert user fast navigation', async () => {
      const instance = render(<App />);

      await waitForAsync(100);

      // Expert user rapid workflow
      pressKey(instance, 'ctrl+c'); // Quick to config
      await waitForAsync(50);
      pressKey(instance, 't'); // Test config
      await waitForAsync(50);
      pressKey(instance, 'ctrl+a'); // Quick to auth
      await waitForAsync(50);
      pressKey(instance, 'ctrl+t'); // Quick to tokens

      await waitForAsync(100);

      expect(instance.lastFrame()).toContain('Token');
    });

    test('should provide helpful error messages for common mistakes', async () => {
      const ProviderConfigManager = require('../../../providers/ProviderConfig.js').ProviderConfigManager;
      const configManager = new ProviderConfigManager();

      configManager.validateProvider.mockResolvedValue({
        valid: false,
        errors: ['Client ID is required', 'Token URL must be a valid URL'],
      });

      const instance = render(<App />);

      await waitForAsync(100);

      // Try to save invalid configuration
      pressKey(instance, 'c');
      await waitForAsync(100);
      pressKey(instance, 'n');
      await waitForAsync(50);
      pressKey(instance, 'ctrl+s');

      await waitForAsync(100);

      // Should show helpful error messages
      expect(instance.lastFrame()).toContain('Client ID is required') ||
      expect(instance.lastFrame()).toContain('valid URL');
    });

    test('should preserve user context during session', async () => {
      const instance = render(<App />);

      await waitForAsync(100);

      // User navigates to specific view
      pressKey(instance, 't');
      await waitForAsync(100);

      // Navigate down to second token
      pressKey(instance, 'down');

      // Navigate away and back
      pressKey(instance, 'ctrl+d');
      pressKey(instance, 'ctrl+t');

      await waitForAsync(100);

      // Should maintain selection context
      expect(instance.lastFrame()).toContain('▶') ||
      expect(instance.lastFrame()).toContain('selected');
    });
  });
});