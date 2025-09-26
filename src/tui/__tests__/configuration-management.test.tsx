import React from 'react';
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { render, pressKey, waitForAsync, mockProviders, mockConfigLoader, setupTestEnvironment } from './test-utils.js';
import { EnhancedConfigManager } from '../components/Config/EnhancedConfigManager.js';
import { ProviderEditor } from '../components/Config/ProviderEditor.js';
import { ProviderDiscovery } from '../components/Config/ProviderDiscovery.js';
import { ProviderTemplates } from '../components/Config/ProviderTemplates.js';
import { ConfigManager } from '../screens/ConfigManager.js';
import { ConfigEditor } from '../components/forms/ConfigEditor.js';
import { ConfigTester } from '../components/forms/ConfigTester.js';

// Mock configuration and discovery services
jest.mock('../../../config/ConfigLoader.js', () => ({
  ConfigLoader: jest.fn().mockImplementation(() => mockConfigLoader),
}));

jest.mock('../../../providers/DiscoveryClient.js', () => ({
  DiscoveryClient: jest.fn().mockImplementation(() => ({
    discover: jest.fn().mockResolvedValue({
      issuer: 'https://example.com',
      authorization_endpoint: 'https://example.com/oauth/authorize',
      token_endpoint: 'https://example.com/oauth/token',
      userinfo_endpoint: 'https://example.com/oauth/userinfo',
      jwks_uri: 'https://example.com/.well-known/jwks.json',
      scopes_supported: ['openid', 'profile', 'email'],
    }),
    validate: jest.fn().mockResolvedValue({ valid: true }),
  })),
}));

jest.mock('../../../providers/ProviderConfig.js', () => ({
  ProviderConfigManager: jest.fn().mockImplementation(() => ({
    loadProviders: jest.fn().mockResolvedValue(mockProviders),
    saveProvider: jest.fn().mockResolvedValue(true),
    deleteProvider: jest.fn().mockResolvedValue(true),
    validateProvider: jest.fn().mockResolvedValue({ valid: true }),
    testEndpoint: jest.fn().mockResolvedValue({ status: 200, data: 'OK' }),
    exportConfig: jest.fn().mockResolvedValue('exported-config'),
    importConfig: jest.fn().mockResolvedValue(true),
  })),
}));

describe('Configuration Management Tests', () => {
  let cleanup: () => void;

  beforeEach(() => {
    cleanup = setupTestEnvironment();
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('EnhancedConfigManager Component', () => {
    test('should render configuration manager', async () => {
      const { lastFrame } = render(<EnhancedConfigManager />);

      await waitForAsync(100);
      expect(lastFrame()).toContain('Configuration') ||
      expect(lastFrame()).toContain('Config');
    });

    test('should display provider list', async () => {
      const instance = render(<EnhancedConfigManager />);

      await waitForAsync(100);

      const frame = instance.lastFrame();
      expect(frame).toContain('google') ||
      expect(frame).toContain('github') ||
      expect(frame).toContain('Provider');
    });

    test('should create new provider configuration', async () => {
      const ProviderConfigManager = require('../../../providers/ProviderConfig.js').ProviderConfigManager;
      const configManager = new ProviderConfigManager();

      const instance = render(<EnhancedConfigManager />);

      await waitForAsync(100);

      // Create new provider
      pressKey(instance, 'n');
      await waitForAsync(50);

      expect(instance.lastFrame()).toContain('New') ||
      expect(instance.lastFrame()).toContain('Create');
    });

    test('should edit existing provider', async () => {
      const instance = render(<EnhancedConfigManager />);

      await waitForAsync(100);

      // Edit first provider
      pressKey(instance, 'enter');
      await waitForAsync(50);

      expect(instance.lastFrame()).toContain('Edit') ||
      expect(instance.lastFrame()).toContain('google');
    });

    test('should delete provider with confirmation', async () => {
      const ProviderConfigManager = require('../../../providers/ProviderConfig.js').ProviderConfigManager;
      const configManager = new ProviderConfigManager();

      const instance = render(<EnhancedConfigManager />);

      await waitForAsync(100);

      // Delete provider
      pressKey(instance, 'd');
      await waitForAsync(50);

      // Confirm deletion
      pressKey(instance, 'y');
      await waitForAsync(50);

      expect(configManager.deleteProvider).toHaveBeenCalled();
    });

    test('should test provider configuration', async () => {
      const ProviderConfigManager = require('../../../providers/ProviderConfig.js').ProviderConfigManager;
      const configManager = new ProviderConfigManager();

      const instance = render(<EnhancedConfigManager />);

      await waitForAsync(100);

      // Test provider
      pressKey(instance, 't');
      await waitForAsync(50);

      expect(configManager.testEndpoint).toHaveBeenCalled();
    });

    test('should export configurations', async () => {
      const ProviderConfigManager = require('../../../providers/ProviderConfig.js').ProviderConfigManager;
      const configManager = new ProviderConfigManager();

      const instance = render(<EnhancedConfigManager />);

      await waitForAsync(100);

      // Export config
      pressKey(instance, 'e');
      await waitForAsync(50);

      expect(configManager.exportConfig).toHaveBeenCalled();
    });

    test('should import configurations', async () => {
      const ProviderConfigManager = require('../../../providers/ProviderConfig.js').ProviderConfigManager;
      const configManager = new ProviderConfigManager();

      const instance = render(<EnhancedConfigManager />);

      await waitForAsync(100);

      // Import config
      pressKey(instance, 'i');
      await waitForAsync(50);

      expect(configManager.importConfig).toHaveBeenCalled() ||
      expect(instance.lastFrame()).toContain('import');
    });
  });

  describe('ProviderEditor Component', () => {
    test('should render provider editor form', () => {
      const props = {
        provider: mockProviders[0],
        onSave: jest.fn(),
        onCancel: jest.fn(),
      };

      const { lastFrame } = render(<ProviderEditor {...props} />);

      expect(lastFrame()).toContain('google') &&
      expect(lastFrame()).toContain('Client ID');
    });

    test('should validate required fields', () => {
      const props = {
        provider: null,
        onSave: jest.fn(),
        onCancel: jest.fn(),
      };

      const instance = render(<ProviderEditor {...props} />);

      // Try to save without filling required fields
      pressKey(instance, 'tab'); // Navigate to save button
      pressKey(instance, 'enter');

      expect(instance.lastFrame()).toContain('required') ||
      expect(instance.lastFrame()).toContain('Name');
    });

    test('should save provider configuration', async () => {
      const props = {
        provider: mockProviders[0],
        onSave: jest.fn(),
        onCancel: jest.fn(),
      };

      const instance = render(<ProviderEditor {...props} />);

      // Fill form and save
      await waitForAsync(50);

      // Navigate to save button and submit
      pressKey(instance, 'tab');
      pressKey(instance, 'tab');
      pressKey(instance, 'enter');

      await waitForAsync(50);
      expect(props.onSave).toHaveBeenCalled();
    });

    test('should cancel editing', () => {
      const props = {
        provider: mockProviders[0],
        onSave: jest.fn(),
        onCancel: jest.fn(),
      };

      const instance = render(<ProviderEditor {...props} />);

      pressKey(instance, 'escape');
      expect(props.onCancel).toHaveBeenCalled();
    });

    test('should validate URLs', () => {
      const props = {
        provider: null,
        onSave: jest.fn(),
        onCancel: jest.fn(),
      };

      const instance = render(<ProviderEditor {...props} />);

      // Enter invalid URL
      instance.stdin.write('invalid-url');
      pressKey(instance, 'tab');

      expect(instance.lastFrame()).toContain('valid URL') ||
      expect(instance.lastFrame()).toContain('invalid');
    });
  });

  describe('ProviderDiscovery Component', () => {
    test('should render discovery interface', () => {
      const props = {
        onDiscovered: jest.fn(),
        onCancel: jest.fn(),
      };

      const { lastFrame } = render(<ProviderDiscovery {...props} />);

      expect(lastFrame()).toContain('Discovery') ||
      expect(lastFrame()).toContain('discover');
    });

    test('should discover provider configuration', async () => {
      const DiscoveryClient = require('../../../providers/DiscoveryClient.js').DiscoveryClient;
      const discoveryClient = new DiscoveryClient();

      const props = {
        onDiscovered: jest.fn(),
        onCancel: jest.fn(),
      };

      const instance = render(<ProviderDiscovery {...props} />);

      // Enter discovery URL
      instance.stdin.write('https://accounts.google.com/.well-known/openid_configuration');
      pressKey(instance, 'enter');

      await waitForAsync(100);

      expect(discoveryClient.discover).toHaveBeenCalled();
      expect(props.onDiscovered).toHaveBeenCalled();
    });

    test('should handle discovery errors', async () => {
      const DiscoveryClient = require('../../../providers/DiscoveryClient.js').DiscoveryClient;
      const discoveryClient = new DiscoveryClient();
      discoveryClient.discover.mockRejectedValue(new Error('Discovery failed'));

      const props = {
        onDiscovered: jest.fn(),
        onCancel: jest.fn(),
      };

      const instance = render(<ProviderDiscovery {...props} />);

      instance.stdin.write('https://invalid-url');
      pressKey(instance, 'enter');

      await waitForAsync(100);

      expect(instance.lastFrame()).toContain('Error') ||
      expect(instance.lastFrame()).toContain('failed');
    });

    test('should validate discovery URL', () => {
      const props = {
        onDiscovered: jest.fn(),
        onCancel: jest.fn(),
      };

      const instance = render(<ProviderDiscovery {...props} />);

      // Enter invalid URL
      instance.stdin.write('not-a-url');
      pressKey(instance, 'enter');

      expect(instance.lastFrame()).toContain('valid URL') ||
      expect(instance.lastFrame()).toContain('invalid');
    });
  });

  describe('ProviderTemplates Component', () => {
    test('should render provider templates', () => {
      const props = {
        onSelect: jest.fn(),
        onCancel: jest.fn(),
      };

      const { lastFrame } = render(<ProviderTemplates {...props} />);

      expect(lastFrame()).toContain('Template') ||
      expect(lastFrame()).toContain('Select');
    });

    test('should display popular providers', () => {
      const props = {
        onSelect: jest.fn(),
        onCancel: jest.fn(),
      };

      const { lastFrame } = render(<ProviderTemplates {...props} />);

      expect(lastFrame()).toContain('Google') ||
      expect(lastFrame()).toContain('GitHub') ||
      expect(lastFrame()).toContain('Microsoft');
    });

    test('should select provider template', () => {
      const props = {
        onSelect: jest.fn(),
        onCancel: jest.fn(),
      };

      const instance = render(<ProviderTemplates {...props} />);

      pressKey(instance, 'enter');
      expect(props.onSelect).toHaveBeenCalled();
    });

    test('should navigate through templates', () => {
      const props = {
        onSelect: jest.fn(),
        onCancel: jest.fn(),
      };

      const instance = render(<ProviderTemplates {...props} />);

      pressKey(instance, 'down');
      pressKey(instance, 'up');

      expect(instance.lastFrame()).toContain('▶') ||
      expect(instance.lastFrame()).toContain('selected');
    });
  });

  describe('ConfigManager Screen', () => {
    test('should render config manager screen', () => {
      const props = { onBack: jest.fn() };
      const { lastFrame } = render(<ConfigManager {...props} />);

      expect(lastFrame()).toContain('Configuration Manager') ||
      expect(lastFrame()).toContain('Config Manager');
    });

    test('should handle back navigation', () => {
      const props = { onBack: jest.fn() };
      const instance = render(<ConfigManager {...props} />);

      pressKey(instance, 'escape');
      expect(props.onBack).toHaveBeenCalled();
    });

    test('should show configuration overview', () => {
      const props = { onBack: jest.fn() };
      const { lastFrame } = render(<ConfigManager {...props} />);

      expect(lastFrame()).toContain('Providers') ||
      expect(lastFrame()).toContain('Configuration');
    });
  });

  describe('ConfigEditor Component', () => {
    test('should render configuration editor', () => {
      const props = {
        config: mockProviders[0],
        onSave: jest.fn(),
        onCancel: jest.fn(),
      };

      const { lastFrame } = render(<ConfigEditor {...props} />);

      expect(lastFrame()).toContain('Configuration') ||
      expect(lastFrame()).toContain('Edit');
    });

    test('should validate configuration schema', () => {
      const props = {
        config: { name: '' }, // Invalid config
        onSave: jest.fn(),
        onCancel: jest.fn(),
      };

      const instance = render(<ConfigEditor {...props} />);

      // Try to save invalid config
      pressKey(instance, 'ctrl+s');

      expect(instance.lastFrame()).toContain('validation') ||
      expect(instance.lastFrame()).toContain('required');
    });

    test('should save valid configuration', async () => {
      const props = {
        config: mockProviders[0],
        onSave: jest.fn(),
        onCancel: jest.fn(),
      };

      const instance = render(<ConfigEditor {...props} />);

      pressKey(instance, 'ctrl+s');
      await waitForAsync(50);

      expect(props.onSave).toHaveBeenCalled();
    });
  });

  describe('ConfigTester Component', () => {
    test('should render configuration tester', () => {
      const props = {
        config: mockProviders[0],
        onBack: jest.fn(),
      };

      const { lastFrame } = render(<ConfigTester {...props} />);

      expect(lastFrame()).toContain('Test') ||
      expect(lastFrame()).toContain('Configuration');
    });

    test('should test endpoint connectivity', async () => {
      const ProviderConfigManager = require('../../../providers/ProviderConfig.js').ProviderConfigManager;
      const configManager = new ProviderConfigManager();

      const props = {
        config: mockProviders[0],
        onBack: jest.fn(),
      };

      const instance = render(<ConfigTester {...props} />);

      // Test endpoints
      pressKey(instance, 't');
      await waitForAsync(50);

      expect(configManager.testEndpoint).toHaveBeenCalled();
    });

    test('should show test results', async () => {
      const ProviderConfigManager = require('../../../providers/ProviderConfig.js').ProviderConfigManager;
      const configManager = new ProviderConfigManager();
      configManager.testEndpoint.mockResolvedValue({ status: 200, success: true });

      const props = {
        config: mockProviders[0],
        onBack: jest.fn(),
      };

      const instance = render(<ConfigTester {...props} />);

      pressKey(instance, 't');
      await waitForAsync(100);

      expect(instance.lastFrame()).toContain('Success') ||
      expect(instance.lastFrame()).toContain('200') ||
      expect(instance.lastFrame()).toContain('✓');
    });

    test('should handle test failures', async () => {
      const ProviderConfigManager = require('../../../providers/ProviderConfig.js').ProviderConfigManager;
      const configManager = new ProviderConfigManager();
      configManager.testEndpoint.mockResolvedValue({ status: 404, error: 'Not found' });

      const props = {
        config: mockProviders[0],
        onBack: jest.fn(),
      };

      const instance = render(<ConfigTester {...props} />);

      pressKey(instance, 't');
      await waitForAsync(100);

      expect(instance.lastFrame()).toContain('Error') ||
      expect(instance.lastFrame()).toContain('404') ||
      expect(instance.lastFrame()).toContain('failed');
    });
  });

  describe('Configuration Integration Tests', () => {
    test('should handle full configuration workflow', async () => {
      const ProviderConfigManager = require('../../../providers/ProviderConfig.js').ProviderConfigManager;
      const configManager = new ProviderConfigManager();

      const instance = render(<EnhancedConfigManager />);

      await waitForAsync(100);

      // Create new provider
      pressKey(instance, 'n');
      await waitForAsync(50);

      // Edit provider details
      pressKey(instance, 'tab');
      pressKey(instance, 'enter');
      await waitForAsync(50);

      // Test configuration
      pressKey(instance, 'escape');
      pressKey(instance, 't');
      await waitForAsync(50);

      // Save configuration
      pressKey(instance, 'escape');
      pressKey(instance, 's');
      await waitForAsync(50);

      expect(configManager.loadProviders).toHaveBeenCalled();
      expect(configManager.testEndpoint).toHaveBeenCalled();
    });

    test('should handle configuration validation', async () => {
      const ProviderConfigManager = require('../../../providers/ProviderConfig.js').ProviderConfigManager;
      const configManager = new ProviderConfigManager();
      configManager.validateProvider.mockResolvedValue({ valid: false, errors: ['Missing client ID'] });

      const instance = render(<EnhancedConfigManager />);

      await waitForAsync(100);

      // Try to save invalid provider
      pressKey(instance, 'n');
      await waitForAsync(50);

      pressKey(instance, 'ctrl+s');
      await waitForAsync(50);

      expect(instance.lastFrame()).toContain('Missing client ID') ||
      expect(instance.lastFrame()).toContain('validation error');
    });

    test('should handle configuration import/export', async () => {
      const ProviderConfigManager = require('../../../providers/ProviderConfig.js').ProviderConfigManager;
      const configManager = new ProviderConfigManager();

      const instance = render(<EnhancedConfigManager />);

      await waitForAsync(100);

      // Export configuration
      pressKey(instance, 'e');
      await waitForAsync(50);

      // Import configuration
      pressKey(instance, 'i');
      await waitForAsync(50);

      expect(configManager.exportConfig).toHaveBeenCalled();
      expect(configManager.importConfig).toHaveBeenCalled();
    });

    test('should maintain configuration state', async () => {
      const instance = render(<EnhancedConfigManager />);

      await waitForAsync(100);

      // Navigate through providers
      pressKey(instance, 'down');
      pressKey(instance, 'up');

      // Edit provider
      pressKey(instance, 'enter');
      await waitForAsync(50);

      // Go back and verify state
      pressKey(instance, 'escape');

      expect(instance.lastFrame()).toContain('google') ||
      expect(instance.lastFrame()).toContain('▶');
    });
  });
});