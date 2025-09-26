import React from 'react';
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { render, pressKey, waitForAsync, setupTestEnvironment } from './test-utils.js';
import { HelpCenter } from '../screens/HelpCenter.js';
import { HelpModal } from '../components/Common/HelpModal.js';
import { KeyboardShortcuts } from '../components/Common/KeyboardShortcuts.js';
import { InteractiveTutorial } from '../components/Common/InteractiveTutorial.js';
import { SearchModal } from '../components/Common/SearchModal.js';
import { CommandHistory } from '../screens/CommandHistory.js';

// Mock command history hook
jest.mock('../hooks/useCommandHistory.ts', () => ({
  useCommandHistory: () => ({
    history: [
      { command: 'oauth auth', timestamp: new Date(), success: true },
      { command: 'oauth tokens', timestamp: new Date(), success: true },
      { command: 'oauth config', timestamp: new Date(), success: false },
    ],
    addCommand: jest.fn(),
    clearHistory: jest.fn(),
    searchHistory: jest.fn(),
  }),
}));

describe('Help System Tests', () => {
  let cleanup: () => void;

  beforeEach(() => {
    cleanup = setupTestEnvironment();
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('HelpCenter Component', () => {
    test('should render help center main menu', () => {
      const props = { onBack: jest.fn() };
      const { lastFrame } = render(<HelpCenter {...props} />);

      expect(lastFrame()).toContain('Help Center') ||
      expect(lastFrame()).toContain('Help');
    });

    test('should display help categories', () => {
      const props = { onBack: jest.fn() };
      const { lastFrame } = render(<HelpCenter {...props} />);

      expect(lastFrame()).toContain('Getting Started') ||
      expect(lastFrame()).toContain('Keyboard Shortcuts') ||
      expect(lastFrame()).toContain('Tutorials');
    });

    test('should navigate through help sections', () => {
      const props = { onBack: jest.fn() };
      const instance = render(<HelpCenter {...props} />);

      // Navigate down through options
      pressKey(instance, 'down');
      pressKey(instance, 'down');
      pressKey(instance, 'up');

      expect(instance.lastFrame()).toContain('▶') ||
      expect(instance.lastFrame()).toContain('selected');
    });

    test('should select help topic', () => {
      const props = { onBack: jest.fn() };
      const instance = render(<HelpCenter {...props} />);

      pressKey(instance, 'enter');

      expect(instance.lastFrame()).toContain('Getting Started') ||
      expect(instance.lastFrame()).toContain('tutorial');
    });

    test('should handle back navigation', () => {
      const props = { onBack: jest.fn() };
      const instance = render(<HelpCenter {...props} />);

      pressKey(instance, 'escape');
      expect(props.onBack).toHaveBeenCalled();
    });

    test('should open keyboard shortcuts', () => {
      const props = { onBack: jest.fn() };
      const instance = render(<HelpCenter {...props} />);

      // Navigate to shortcuts and select
      pressKey(instance, 'down');
      pressKey(instance, 'enter');

      expect(instance.lastFrame()).toContain('Shortcuts') ||
      expect(instance.lastFrame()).toContain('Key');
    });

    test('should open interactive tutorial', () => {
      const props = { onBack: jest.fn() };
      const instance = render(<HelpCenter {...props} />);

      // Navigate to tutorial and select
      pressKey(instance, 'down');
      pressKey(instance, 'down');
      pressKey(instance, 'enter');

      expect(instance.lastFrame()).toContain('Tutorial') ||
      expect(instance.lastFrame()).toContain('Step');
    });

    test('should search help content', () => {
      const props = { onBack: jest.fn() };
      const instance = render(<HelpCenter {...props} />);

      // Open search
      pressKey(instance, '/');

      expect(instance.lastFrame()).toContain('Search') ||
      expect(instance.lastFrame()).toContain('search');
    });
  });

  describe('HelpModal Component', () => {
    test('should render help modal', () => {
      const props = { onClose: jest.fn() };
      const { lastFrame } = render(<HelpModal {...props} />);

      expect(lastFrame()).toContain('Help') &&
      expect(lastFrame()).toContain('Keyboard Shortcuts');
    });

    test('should show keyboard shortcuts', () => {
      const props = { onClose: jest.fn() };
      const { lastFrame } = render(<HelpModal {...props} />);

      expect(lastFrame()).toContain('Ctrl+D') ||
      expect(lastFrame()).toContain('Ctrl+A') ||
      expect(lastFrame()).toContain('ESC');
    });

    test('should close modal with escape', () => {
      const props = { onClose: jest.fn() };
      const instance = render(<HelpModal {...props} />);

      pressKey(instance, 'escape');
      expect(props.onClose).toHaveBeenCalled();
    });

    test('should close modal with q key', () => {
      const props = { onClose: jest.fn() };
      const instance = render(<HelpModal {...props} />);

      pressKey(instance, 'q');
      expect(props.onClose).toHaveBeenCalled();
    });

    test('should display help content sections', () => {
      const props = { onClose: jest.fn() };
      const { lastFrame } = render(<HelpModal {...props} />);

      expect(lastFrame()).toContain('Navigation') ||
      expect(lastFrame()).toContain('Authentication') ||
      expect(lastFrame()).toContain('Configuration');
    });
  });

  describe('KeyboardShortcuts Component', () => {
    test('should render keyboard shortcuts list', () => {
      const { lastFrame } = render(<KeyboardShortcuts />);

      expect(lastFrame()).toContain('Keyboard Shortcuts') &&
      expect(lastFrame()).toContain('Global Shortcuts');
    });

    test('should display global shortcuts', () => {
      const { lastFrame } = render(<KeyboardShortcuts />);

      expect(lastFrame()).toContain('Ctrl+D') &&
      expect(lastFrame()).toContain('Dashboard');
      expect(lastFrame()).toContain('Ctrl+A') &&
      expect(lastFrame()).toContain('Authentication');
      expect(lastFrame()).toContain('ESC') &&
      expect(lastFrame()).toContain('Back');
    });

    test('should display context-specific shortcuts', () => {
      const { lastFrame } = render(<KeyboardShortcuts />);

      expect(lastFrame()).toContain('Token Management') ||
      expect(lastFrame()).toContain('Configuration') ||
      expect(lastFrame()).toContain('Inspector');
    });

    test('should show shortcut descriptions', () => {
      const { lastFrame } = render(<KeyboardShortcuts />);

      expect(lastFrame()).toContain('Navigate') ||
      expect(lastFrame()).toContain('Select') ||
      expect(lastFrame()).toContain('Delete');
    });

    test('should categorize shortcuts', () => {
      const { lastFrame } = render(<KeyboardShortcuts />);

      expect(lastFrame()).toContain('Navigation') ||
      expect(lastFrame()).toContain('Actions') ||
      expect(lastFrame()).toContain('Global');
    });
  });

  describe('InteractiveTutorial Component', () => {
    test('should render tutorial interface', () => {
      const props = { onComplete: jest.fn(), onExit: jest.fn() };
      const { lastFrame } = render(<InteractiveTutorial {...props} />);

      expect(lastFrame()).toContain('Tutorial') ||
      expect(lastFrame()).toContain('Welcome');
    });

    test('should display tutorial steps', () => {
      const props = { onComplete: jest.fn(), onExit: jest.fn() };
      const { lastFrame } = render(<InteractiveTutorial {...props} />);

      expect(lastFrame()).toContain('Step') ||
      expect(lastFrame()).toContain('1');
    });

    test('should navigate through tutorial steps', () => {
      const props = { onComplete: jest.fn(), onExit: jest.fn() };
      const instance = render(<InteractiveTutorial {...props} />);

      // Go to next step
      pressKey(instance, 'enter');

      expect(instance.lastFrame()).toContain('Step') ||
      expect(instance.lastFrame()).toContain('2');
    });

    test('should go back to previous step', () => {
      const props = { onComplete: jest.fn(), onExit: jest.fn() };
      const instance = render(<InteractiveTutorial {...props} />);

      // Go forward then back
      pressKey(instance, 'enter');
      pressKey(instance, 'left');

      expect(instance.lastFrame()).toContain('Step 1') ||
      expect(instance.lastFrame()).toContain('Welcome');
    });

    test('should complete tutorial', () => {
      const props = { onComplete: jest.fn(), onExit: jest.fn() };
      const instance = render(<InteractiveTutorial {...props} />);

      // Navigate through all steps
      for (let i = 0; i < 5; i++) {
        pressKey(instance, 'enter');
        waitForAsync(10);
      }

      expect(props.onComplete).toHaveBeenCalled();
    });

    test('should exit tutorial early', () => {
      const props = { onComplete: jest.fn(), onExit: jest.fn() };
      const instance = render(<InteractiveTutorial {...props} />);

      pressKey(instance, 'escape');
      expect(props.onExit).toHaveBeenCalled();
    });

    test('should show progress indicator', () => {
      const props = { onComplete: jest.fn(), onExit: jest.fn() };
      const { lastFrame } = render(<InteractiveTutorial {...props} />);

      expect(lastFrame()).toContain('1/') ||
      expect(lastFrame()).toContain('Progress') ||
      expect(lastFrame()).toContain('●');
    });
  });

  describe('SearchModal Component', () => {
    test('should render search modal', () => {
      const props = {
        isOpen: true,
        query: '',
        onQueryChange: jest.fn(),
        onSearch: jest.fn(),
        onClose: jest.fn(),
        results: [],
      };

      const { lastFrame } = render(<SearchModal {...props} />);

      expect(lastFrame()).toContain('Search') &&
      expect(lastFrame()).toContain('Type to search');
    });

    test('should handle search input', () => {
      const props = {
        isOpen: true,
        query: '',
        onQueryChange: jest.fn(),
        onSearch: jest.fn(),
        onClose: jest.fn(),
        results: [],
      };

      const instance = render(<SearchModal {...props} />);

      instance.stdin.write('oauth');

      expect(props.onQueryChange).toHaveBeenCalledWith('oauth');
    });

    test('should display search results', () => {
      const results = [
        { title: 'Authentication', description: 'How to authenticate', section: 'auth' },
        { title: 'Configuration', description: 'Setup providers', section: 'config' },
      ];

      const props = {
        isOpen: true,
        query: 'auth',
        onQueryChange: jest.fn(),
        onSearch: jest.fn(),
        onClose: jest.fn(),
        results,
      };

      const { lastFrame } = render(<SearchModal {...props} />);

      expect(lastFrame()).toContain('Authentication') &&
      expect(lastFrame()).toContain('Configuration');
    });

    test('should navigate through search results', () => {
      const results = [
        { title: 'Authentication', description: 'How to authenticate', section: 'auth' },
        { title: 'Configuration', description: 'Setup providers', section: 'config' },
      ];

      const props = {
        isOpen: true,
        query: 'auth',
        onQueryChange: jest.fn(),
        onSearch: jest.fn(),
        onClose: jest.fn(),
        results,
      };

      const instance = render(<SearchModal {...props} />);

      pressKey(instance, 'down');
      pressKey(instance, 'up');

      expect(instance.lastFrame()).toContain('▶') ||
      expect(instance.lastFrame()).toContain('selected');
    });

    test('should select search result', () => {
      const results = [
        { title: 'Authentication', description: 'How to authenticate', section: 'auth' },
      ];

      const props = {
        isOpen: true,
        query: 'auth',
        onQueryChange: jest.fn(),
        onSearch: jest.fn(),
        onClose: jest.fn(),
        results,
      };

      const instance = render(<SearchModal {...props} />);

      pressKey(instance, 'enter');

      expect(props.onSearch).toHaveBeenCalledWith(results[0]);
    });

    test('should close search modal', () => {
      const props = {
        isOpen: true,
        query: '',
        onQueryChange: jest.fn(),
        onSearch: jest.fn(),
        onClose: jest.fn(),
        results: [],
      };

      const instance = render(<SearchModal {...props} />);

      pressKey(instance, 'escape');
      expect(props.onClose).toHaveBeenCalled();
    });
  });

  describe('CommandHistory Component', () => {
    test('should render command history', () => {
      const { lastFrame } = render(<CommandHistory />);

      expect(lastFrame()).toContain('Command History') ||
      expect(lastFrame()).toContain('History');
    });

    test('should display command history entries', () => {
      const { lastFrame } = render(<CommandHistory />);

      expect(lastFrame()).toContain('oauth auth') ||
      expect(lastFrame()).toContain('oauth tokens') ||
      expect(lastFrame()).toContain('oauth config');
    });

    test('should show command success/failure status', () => {
      const { lastFrame } = render(<CommandHistory />);

      expect(lastFrame()).toContain('✓') ||
      expect(lastFrame()).toContain('✗') ||
      expect(lastFrame()).toContain('Success') ||
      expect(lastFrame()).toContain('Failed');
    });

    test('should navigate through history entries', () => {
      const instance = render(<CommandHistory />);

      pressKey(instance, 'down');
      pressKey(instance, 'up');

      expect(instance.lastFrame()).toContain('▶') ||
      expect(instance.lastFrame()).toContain('selected');
    });

    test('should search command history', () => {
      const instance = render(<CommandHistory />);

      // Open search
      pressKey(instance, '/');
      instance.stdin.write('auth');

      expect(instance.lastFrame()).toContain('oauth auth') &&
      !expect(instance.lastFrame()).toContain('oauth tokens');
    });

    test('should clear command history', () => {
      const { useCommandHistory } = require('../hooks/useCommandHistory.ts');
      const { clearHistory } = useCommandHistory();

      const instance = render(<CommandHistory />);

      // Clear history
      pressKey(instance, 'c');

      expect(clearHistory).toHaveBeenCalled();
    });

    test('should show command timestamps', () => {
      const { lastFrame } = render(<CommandHistory />);

      expect(lastFrame()).toMatch(/\d{2}:\d{2}/) || // Time format HH:MM
      expect(lastFrame()).toContain('ago') ||
      expect(lastFrame()).toContain('minute');
    });
  });

  describe('Help System Integration Tests', () => {
    test('should navigate between help sections', () => {
      const props = { onBack: jest.fn() };
      const instance = render(<HelpCenter {...props} />);

      // Navigate to shortcuts
      pressKey(instance, 'down');
      pressKey(instance, 'enter');

      expect(instance.lastFrame()).toContain('Shortcuts');

      // Go back
      pressKey(instance, 'escape');

      expect(instance.lastFrame()).toContain('Help Center');
    });

    test('should maintain help state across navigation', () => {
      const props = { onBack: jest.fn() };
      const instance = render(<HelpCenter {...props} />);

      // Navigate to tutorial
      pressKey(instance, 'down');
      pressKey(instance, 'down');
      pressKey(instance, 'enter');

      // Go back to menu
      pressKey(instance, 'escape');

      // Should remember position
      expect(instance.lastFrame()).toContain('▶');
    });

    test('should handle search across help content', () => {
      const props = { onBack: jest.fn() };
      const instance = render(<HelpCenter {...props} />);

      // Open search
      pressKey(instance, '/');
      instance.stdin.write('keyboard');
      pressKey(instance, 'enter');

      expect(instance.lastFrame()).toContain('Keyboard Shortcuts') ||
      expect(instance.lastFrame()).toContain('shortcut');
    });

    test('should provide contextual help', () => {
      const props = { onBack: jest.fn() };
      const instance = render(<HelpCenter {...props} />);

      // Navigate to specific section
      pressKey(instance, 'enter'); // Getting started

      expect(instance.lastFrame()).toContain('Getting Started') &&
      expect(instance.lastFrame()).toContain('OAuth');
    });

    test('should handle help modal overlay', () => {
      const helpProps = { onClose: jest.fn() };
      const centerProps = { onBack: jest.fn() };

      // Simulate help modal over help center
      const instance = render(
        <div>
          <HelpCenter {...centerProps} />
          <HelpModal {...helpProps} />
        </div>
      );

      expect(instance.lastFrame()).toContain('Help') &&
      expect(instance.lastFrame()).toContain('Shortcuts');
    });
  });
});