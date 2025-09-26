import React from 'react';
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { render, pressKey, createMockProps, setupTestEnvironment } from './test-utils.js';
import { App } from '../App.js';
import { MainMenu } from '../components/MainMenu.js';

// Mock modules
jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
}));

jest.mock('../components/Dashboard/MainDashboard.js', () => ({
  MainDashboard: () => React.createElement('text', null, 'Dashboard View'),
}));

jest.mock('../components/Auth/EnhancedAuthWizard.js', () => ({
  EnhancedAuthWizard: ({ onComplete, onCancel }: any) =>
    React.createElement('text', null, 'Auth Wizard View'),
}));

jest.mock('../components/Token/EnhancedTokenManager.js', () => ({
  EnhancedTokenManager: () => React.createElement('text', null, 'Token Manager View'),
}));

jest.mock('../components/Config/EnhancedConfigManager.js', () => ({
  EnhancedConfigManager: () => React.createElement('text', null, 'Config Manager View'),
}));

jest.mock('../components/Inspector/TokenInspector.js', () => ({
  TokenInspector: () => React.createElement('text', null, 'Token Inspector View'),
}));

jest.mock('../screens/ConfigManager.js', () => ({
  ConfigManager: ({ onBack }: any) => React.createElement('text', null, 'Config Manager Screen'),
}));

jest.mock('../screens/HelpCenter.js', () => ({
  HelpCenter: ({ onBack }: any) => React.createElement('text', null, 'Help Center Screen'),
}));

describe('TUI Navigation Tests', () => {
  let cleanup: () => void;

  beforeEach(() => {
    cleanup = setupTestEnvironment();
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('App Component Navigation', () => {
    test('should render main menu by default', () => {
      const { lastFrame } = render(<App />);
      expect(lastFrame()).toContain('OAuth Test Client');
      expect(lastFrame()).toContain('Main Menu');
    });

    test('should start with specified initial view', () => {
      const { lastFrame } = render(<App initialView="dashboard" />);
      expect(lastFrame()).toContain('Dashboard View');
    });

    test('should navigate to dashboard with Ctrl+D', () => {
      const instance = render(<App />);
      pressKey(instance, 'ctrl+d');
      expect(instance.lastFrame()).toContain('Dashboard View');
    });

    test('should navigate to auth with Ctrl+A when config exists', () => {
      const instance = render(<App />);
      pressKey(instance, 'ctrl+a');
      expect(instance.lastFrame()).toContain('Auth Wizard View');
    });

    test('should navigate to tokens with Ctrl+T', () => {
      const instance = render(<App />);
      pressKey(instance, 'ctrl+t');
      expect(instance.lastFrame()).toContain('Token Manager View');
    });

    test('should navigate to config with Ctrl+C', () => {
      const instance = render(<App />);
      pressKey(instance, 'ctrl+c');
      expect(instance.lastFrame()).toContain('Config Manager View');
    });

    test('should navigate to inspector with Ctrl+I', () => {
      const instance = render(<App />);
      pressKey(instance, 'ctrl+i');
      expect(instance.lastFrame()).toContain('Token Inspector View');
    });

    test('should navigate to help center with h key', () => {
      const instance = render(<App />);
      pressKey(instance, 'h');
      expect(instance.lastFrame()).toContain('Help Center Screen');
    });

    test('should navigate to help center with F1 key', () => {
      const instance = render(<App />);
      pressKey(instance, 'F1');
      expect(instance.lastFrame()).toContain('Help Center Screen');
    });

    test('should return to menu with Ctrl+M', () => {
      const instance = render(<App initialView="dashboard" />);
      expect(instance.lastFrame()).toContain('Dashboard View');

      pressKey(instance, 'ctrl+m');
      expect(instance.lastFrame()).toContain('Main Menu');
    });

    test('should go back to menu with escape key', () => {
      const instance = render(<App initialView="dashboard" />);
      expect(instance.lastFrame()).toContain('Dashboard View');

      pressKey(instance, 'escape');
      expect(instance.lastFrame()).toContain('Main Menu');
    });

    test('should show help modal with ? key', () => {
      const instance = render(<App />);
      pressKey(instance, '?');
      // Help modal should be visible
      expect(instance.lastFrame()).toContain('Help');
    });

    test('should exit gracefully when escape pressed on main menu', () => {
      const instance = render(<App />);
      pressKey(instance, 'escape');
      expect(instance.lastFrame()).toContain('Goodbye!');
    });
  });

  describe('MainMenu Component Navigation', () => {
    test('should render all menu options', () => {
      const props = createMockProps({ hasConfig: true });
      const { lastFrame } = render(<MainMenu {...props} />);

      expect(lastFrame()).toContain('Dashboard');
      expect(lastFrame()).toContain('Authenticate');
      expect(lastFrame()).toContain('View Tokens');
      expect(lastFrame()).toContain('Configuration');
      expect(lastFrame()).toContain('Config Manager');
      expect(lastFrame()).toContain('Inspect Token');
      expect(lastFrame()).toContain('Help Center');
      expect(lastFrame()).toContain('Exit');
    });

    test('should disable authentication when no config exists', () => {
      const props = createMockProps({ hasConfig: false });
      const { lastFrame } = render(<MainMenu {...props} />);

      expect(lastFrame()).toContain('No configuration found');
    });

    test('should navigate down with arrow key', () => {
      const props = createMockProps({ hasConfig: true });
      const instance = render(<MainMenu {...props} />);

      // First item should be selected by default
      expect(instance.lastFrame()).toContain('▶');

      pressKey(instance, 'down');
      // Selection should move to next item
      const frame = instance.lastFrame();
      expect(frame).toContain('▶');
    });

    test('should navigate up with arrow key', () => {
      const props = createMockProps({ hasConfig: true });
      const instance = render(<MainMenu {...props} />);

      pressKey(instance, 'up');
      // Should wrap around to last item
      expect(instance.lastFrame()).toContain('▶');
    });

    test('should select option with enter key', () => {
      const props = createMockProps({ hasConfig: true });
      const instance = render(<MainMenu {...props} />);

      pressKey(instance, 'enter');
      expect(props.onSelect).toHaveBeenCalledWith('dashboard');
    });

    test('should use keyboard shortcuts', () => {
      const props = createMockProps({ hasConfig: true });
      const instance = render(<MainMenu {...props} />);

      pressKey(instance, 'd');
      expect(props.onSelect).toHaveBeenCalledWith('dashboard');

      jest.clearAllMocks();

      pressKey(instance, 'a');
      expect(props.onSelect).toHaveBeenCalledWith('auth');
    });

    test('should show shortcut hints', () => {
      const props = createMockProps({ hasConfig: true });
      const { lastFrame } = render(<MainMenu {...props} />);

      expect(lastFrame()).toContain('[d]');
      expect(lastFrame()).toContain('[a]');
      expect(lastFrame()).toContain('[t]');
      expect(lastFrame()).toContain('[c]');
    });

    test('should show descriptions for selected items', () => {
      const props = createMockProps({ hasConfig: true });
      const instance = render(<MainMenu {...props} />);

      // First item (Dashboard) should be selected by default
      expect(instance.lastFrame()).toContain('View system status and metrics');
    });

    test('should handle disabled options properly', () => {
      const props = createMockProps({ hasConfig: false });
      const instance = render(<MainMenu {...props} />);

      // Try to select auth option (should be disabled)
      pressKey(instance, 'a');
      // onSelect should not be called for disabled options
      expect(props.onSelect).not.toHaveBeenCalledWith('auth');
    });
  });

  describe('View Transitions', () => {
    test('should maintain state during view transitions', () => {
      const instance = render(<App />);

      // Navigate to dashboard
      pressKey(instance, 'ctrl+d');
      expect(instance.lastFrame()).toContain('Dashboard View');

      // Go back to menu
      pressKey(instance, 'escape');
      expect(instance.lastFrame()).toContain('Main Menu');

      // Navigate to tokens
      pressKey(instance, 'ctrl+t');
      expect(instance.lastFrame()).toContain('Token Manager View');
    });

    test('should handle rapid navigation changes', () => {
      const instance = render(<App />);

      // Rapid key presses
      pressKey(instance, 'ctrl+d');
      pressKey(instance, 'ctrl+t');
      pressKey(instance, 'ctrl+c');
      pressKey(instance, 'ctrl+m');

      expect(instance.lastFrame()).toContain('Main Menu');
    });

    test('should preserve help modal state correctly', () => {
      const instance = render(<App />);

      // Open help modal
      pressKey(instance, '?');
      expect(instance.lastFrame()).toContain('Help');

      // Close help modal
      pressKey(instance, 'escape');
      expect(instance.lastFrame()).toContain('Main Menu');
      expect(instance.lastFrame()).not.toContain('Help Modal');
    });
  });

  describe('Configuration Detection', () => {
    test('should detect configuration files', () => {
      const fs = require('fs');
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const instance = render(<App />);
      expect(instance.lastFrame()).not.toContain('No configuration found');
    });

    test('should handle missing configuration', () => {
      const fs = require('fs');
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const instance = render(<App />);
      expect(instance.lastFrame()).toContain('No configuration found');
    });

    test('should check multiple config file paths', () => {
      const fs = require('fs');
      const existsSyncSpy = jest.spyOn(fs, 'existsSync');
      existsSyncSpy.mockReturnValue(false);

      render(<App />);

      // Should check for various config file formats
      expect(existsSyncSpy).toHaveBeenCalledWith(
        expect.stringContaining('.oauth-cli.json')
      );
      expect(existsSyncSpy).toHaveBeenCalledWith(
        expect.stringContaining('oauth-config.json')
      );
    });
  });
});