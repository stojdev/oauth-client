import React from 'react';
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { render, pressKey, waitForAsync, mockOAuthClient, mockProviders, setupTestEnvironment } from './test-utils.js';
import { EnhancedAuthWizard } from '../components/Auth/EnhancedAuthWizard.js';
import { FlowSelector } from '../components/Auth/FlowSelector.js';
import { AuthorizationCodeFlow } from '../components/Auth/flows/AuthorizationCodeFlow.js';
import { ClientCredentialsFlow } from '../components/Auth/flows/ClientCredentialsFlow.js';
import { DeviceCodeFlow } from '../components/Auth/flows/DeviceCodeFlow.js';

// Mock OAuth client and provider manager
jest.mock('../../../core/OAuthClient.js', () => ({
  OAuthClient: jest.fn().mockImplementation(() => mockOAuthClient),
}));

jest.mock('../../../providers/ProviderConfig.js', () => ({
  ProviderConfigManager: jest.fn().mockImplementation(() => ({
    loadProviders: jest.fn().mockResolvedValue(mockProviders),
    getProvider: jest.fn().mockImplementation((name: string) =>
      mockProviders.find(p => p.name === name)
    ),
    getSupportedFlows: jest.fn().mockReturnValue(['authorization_code', 'client_credentials', 'device_code']),
  })),
}));

describe('Authentication Flows Tests', () => {
  let cleanup: () => void;

  beforeEach(() => {
    cleanup = setupTestEnvironment();
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('EnhancedAuthWizard Component', () => {
    test('should render provider selection initially', async () => {
      const props = { onComplete: jest.fn(), onCancel: jest.fn() };
      const { lastFrame } = render(<EnhancedAuthWizard {...props} />);

      await waitForAsync(100);
      expect(lastFrame()).toContain('Select OAuth Provider');
    });

    test('should progress through wizard steps', async () => {
      const props = { onComplete: jest.fn(), onCancel: jest.fn() };
      const instance = render(<EnhancedAuthWizard {...props} />);

      await waitForAsync(100);

      // Step 1: Select provider
      pressKey(instance, 'enter'); // Select first provider
      await waitForAsync(50);

      // Step 2: Select flow
      expect(instance.lastFrame()).toContain('Select OAuth Flow');

      pressKey(instance, 'enter'); // Select first flow
      await waitForAsync(50);

      // Step 3: Configure flow
      expect(instance.lastFrame()).toContain('Configure');
    });

    test('should handle provider selection', async () => {
      const props = { onComplete: jest.fn(), onCancel: jest.fn() };
      const instance = render(<EnhancedAuthWizard {...props} />);

      await waitForAsync(100);

      // Navigate to second provider
      pressKey(instance, 'down');
      pressKey(instance, 'enter');

      await waitForAsync(50);
      expect(instance.lastFrame()).toContain('Select OAuth Flow');
    });

    test('should cancel authentication wizard', async () => {
      const props = { onComplete: jest.fn(), onCancel: jest.fn() };
      const instance = render(<EnhancedAuthWizard {...props} />);

      await waitForAsync(100);

      pressKey(instance, 'escape');
      expect(props.onCancel).toHaveBeenCalled();
    });

    test('should handle authentication errors', async () => {
      mockOAuthClient.authenticate.mockRejectedValue(new Error('Auth failed'));

      const props = { onComplete: jest.fn(), onCancel: jest.fn() };
      const instance = render(<EnhancedAuthWizard {...props} />);

      await waitForAsync(100);

      // Complete wizard steps quickly
      pressKey(instance, 'enter'); // Select provider
      await waitForAsync(50);
      pressKey(instance, 'enter'); // Select flow
      await waitForAsync(50);

      // Error should be displayed
      await waitForAsync(100);
      expect(instance.lastFrame()).toContain('Error') ||
      expect(instance.lastFrame()).toContain('failed');
    });

    test('should complete authentication successfully', async () => {
      mockOAuthClient.authenticate.mockResolvedValue({
        access_token: 'test-token',
        token_type: 'Bearer',
        expires_in: 3600,
      });

      const props = { onComplete: jest.fn(), onCancel: jest.fn() };
      const instance = render(<EnhancedAuthWizard {...props} />);

      await waitForAsync(100);

      // Complete wizard steps
      pressKey(instance, 'enter'); // Select provider
      await waitForAsync(50);
      pressKey(instance, 'enter'); // Select flow
      await waitForAsync(100);

      expect(props.onComplete).toHaveBeenCalled();
    });
  });

  describe('FlowSelector Component', () => {
    test('should render all available flows', () => {
      const flows = ['authorization_code', 'client_credentials', 'device_code'];
      const props = {
        availableFlows: flows,
        onSelect: jest.fn(),
        onBack: jest.fn(),
      };

      const { lastFrame } = render(<FlowSelector {...props} />);

      expect(lastFrame()).toContain('Authorization Code');
      expect(lastFrame()).toContain('Client Credentials');
      expect(lastFrame()).toContain('Device Code');
    });

    test('should select flow with keyboard navigation', () => {
      const flows = ['authorization_code', 'client_credentials'];
      const props = {
        availableFlows: flows,
        onSelect: jest.fn(),
        onBack: jest.fn(),
      };

      const instance = render(<FlowSelector {...props} />);

      pressKey(instance, 'down');
      pressKey(instance, 'enter');

      expect(props.onSelect).toHaveBeenCalledWith('client_credentials');
    });

    test('should show flow descriptions', () => {
      const flows = ['authorization_code'];
      const props = {
        availableFlows: flows,
        onSelect: jest.fn(),
        onBack: jest.fn(),
      };

      const { lastFrame } = render(<FlowSelector {...props} />);
      expect(lastFrame()).toContain('server-side web applications');
    });

    test('should handle back navigation', () => {
      const flows = ['authorization_code'];
      const props = {
        availableFlows: flows,
        onSelect: jest.fn(),
        onBack: jest.fn(),
      };

      const instance = render(<FlowSelector {...props} />);
      pressKey(instance, 'escape');

      expect(props.onBack).toHaveBeenCalled();
    });
  });

  describe('Authorization Code Flow', () => {
    test('should render authorization code configuration', () => {
      const props = {
        provider: mockProviders[0],
        onComplete: jest.fn(),
        onCancel: jest.fn(),
      };

      const { lastFrame } = render(<AuthorizationCodeFlow {...props} />);

      expect(lastFrame()).toContain('Authorization Code Flow');
      expect(lastFrame()).toContain('Client ID');
      expect(lastFrame()).toContain('Redirect URI');
    });

    test('should validate required fields', () => {
      const props = {
        provider: mockProviders[0],
        onComplete: jest.fn(),
        onCancel: jest.fn(),
      };

      const instance = render(<AuthorizationCodeFlow {...props} />);

      // Try to submit without filling fields
      pressKey(instance, 'enter');

      expect(instance.lastFrame()).toContain('required') ||
      expect(instance.lastFrame()).toContain('Client ID');
    });

    test('should handle PKCE configuration', () => {
      const props = {
        provider: mockProviders[0],
        onComplete: jest.fn(),
        onCancel: jest.fn(),
      };

      const { lastFrame } = render(<AuthorizationCodeFlow {...props} />);

      expect(lastFrame()).toContain('PKCE') ||
      expect(lastFrame()).toContain('Code Challenge');
    });

    test('should start authorization flow', async () => {
      mockOAuthClient.authenticate.mockResolvedValue({
        access_token: 'test-token',
      });

      const props = {
        provider: mockProviders[0],
        onComplete: jest.fn(),
        onCancel: jest.fn(),
      };

      const instance = render(<AuthorizationCodeFlow {...props} />);

      // Fill required fields and submit
      await waitForAsync(100);

      // Should show authorization URL or redirect user
      expect(instance.lastFrame()).toContain('browser') ||
      expect(instance.lastFrame()).toContain('authorization') ||
      expect(mockOAuthClient.authenticate).toHaveBeenCalled();
    });
  });

  describe('Client Credentials Flow', () => {
    test('should render client credentials configuration', () => {
      const props = {
        provider: mockProviders[0],
        onComplete: jest.fn(),
        onCancel: jest.fn(),
      };

      const { lastFrame } = render(<ClientCredentialsFlow {...props} />);

      expect(lastFrame()).toContain('Client Credentials');
      expect(lastFrame()).toContain('Client ID');
      expect(lastFrame()).toContain('Client Secret');
    });

    test('should handle machine-to-machine authentication', async () => {
      mockOAuthClient.authenticate.mockResolvedValue({
        access_token: 'test-token',
        token_type: 'Bearer',
      });

      const props = {
        provider: mockProviders[0],
        onComplete: jest.fn(),
        onCancel: jest.fn(),
      };

      const instance = render(<ClientCredentialsFlow {...props} />);

      await waitForAsync(100);

      expect(instance.lastFrame()).toContain('machine-to-machine') ||
      expect(instance.lastFrame()).toContain('Client Credentials');
    });

    test('should validate client credentials', () => {
      const props = {
        provider: mockProviders[0],
        onComplete: jest.fn(),
        onCancel: jest.fn(),
      };

      const instance = render(<ClientCredentialsFlow {...props} />);

      // Try to authenticate without credentials
      pressKey(instance, 'tab'); // Move to submit
      pressKey(instance, 'enter');

      expect(instance.lastFrame()).toContain('required') ||
      expect(instance.lastFrame()).toContain('Client Secret');
    });
  });

  describe('Device Code Flow', () => {
    test('should render device code flow', () => {
      const props = {
        provider: mockProviders[0],
        onComplete: jest.fn(),
        onCancel: jest.fn(),
      };

      const { lastFrame } = render(<DeviceCodeFlow {...props} />);

      expect(lastFrame()).toContain('Device') ||
      expect(lastFrame()).toContain('device');
    });

    test('should display device code and verification URL', async () => {
      mockOAuthClient.authenticate.mockResolvedValue({
        device_code: 'ABC123',
        user_code: '1234-5678',
        verification_uri: 'https://example.com/device',
        expires_in: 600,
      });

      const props = {
        provider: mockProviders[0],
        onComplete: jest.fn(),
        onCancel: jest.fn(),
      };

      const instance = render(<DeviceCodeFlow {...props} />);

      await waitForAsync(200);

      expect(instance.lastFrame()).toContain('1234-5678') ||
      expect(instance.lastFrame()).toContain('verification') ||
      expect(instance.lastFrame()).toContain('device');
    });

    test('should handle device authorization polling', async () => {
      let pollCount = 0;
      mockOAuthClient.authenticate.mockImplementation(() => {
        pollCount++;
        if (pollCount === 1) {
          return Promise.resolve({
            device_code: 'ABC123',
            user_code: '1234-5678',
            verification_uri: 'https://example.com/device',
          });
        }
        return Promise.resolve({
          access_token: 'test-token',
        });
      });

      const props = {
        provider: mockProviders[0],
        onComplete: jest.fn(),
        onCancel: jest.fn(),
      };

      const instance = render(<DeviceCodeFlow {...props} />);

      await waitForAsync(500);

      expect(mockOAuthClient.authenticate).toHaveBeenCalled();
      expect(props.onComplete).toHaveBeenCalled() ||
      expect(instance.lastFrame()).toContain('Success');
    });
  });

  describe('Flow Integration Tests', () => {
    test('should handle flow switching', async () => {
      const props = { onComplete: jest.fn(), onCancel: jest.fn() };
      const instance = render(<EnhancedAuthWizard {...props} />);

      await waitForAsync(100);

      // Select provider
      pressKey(instance, 'enter');
      await waitForAsync(50);

      // Select first flow
      pressKey(instance, 'enter');
      await waitForAsync(50);

      // Go back and select different flow
      pressKey(instance, 'escape');
      pressKey(instance, 'down');
      pressKey(instance, 'enter');

      await waitForAsync(50);
      expect(instance.lastFrame()).toContain('Configure');
    });

    test('should maintain authentication state', async () => {
      const props = { onComplete: jest.fn(), onCancel: jest.fn() };
      const instance = render(<EnhancedAuthWizard {...props} />);

      await waitForAsync(100);

      // Complete authentication
      pressKey(instance, 'enter'); // Provider
      await waitForAsync(50);
      pressKey(instance, 'enter'); // Flow
      await waitForAsync(100);

      // State should be maintained throughout
      expect(mockOAuthClient.authenticate).toHaveBeenCalled() ||
      expect(instance.lastFrame()).toContain('Configure');
    });

    test('should handle concurrent authentications', async () => {
      const props1 = { onComplete: jest.fn(), onCancel: jest.fn() };
      const props2 = { onComplete: jest.fn(), onCancel: jest.fn() };

      const instance1 = render(<EnhancedAuthWizard {...props1} />);
      const instance2 = render(<EnhancedAuthWizard {...props2} />);

      await waitForAsync(100);

      // Both instances should work independently
      expect(instance1.lastFrame()).toContain('OAuth');
      expect(instance2.lastFrame()).toContain('OAuth');
    });
  });
});