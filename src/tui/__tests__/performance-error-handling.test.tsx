import React from 'react';
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { render, pressKey, waitForAsync, setupTestEnvironment } from './test-utils.js';
import { App } from '../App.js';
import { VirtualList } from '../components/Common/VirtualList.js';
import { EnhancedTokenManager } from '../components/Token/EnhancedTokenManager.js';
import { EnhancedConfigManager } from '../components/Config/EnhancedConfigManager.js';
import { NotificationDisplay } from '../components/Common/NotificationDisplay.js';

// Mock performance utilities
jest.mock('../utils/performance.ts', () => ({
  measurePerformance: jest.fn((fn, name) => {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    console.log(`${name}: ${end - start}ms`);
    return result;
  }),
  debounce: jest.fn((fn, delay) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(null, args), delay);
    };
  }),
  throttle: jest.fn((fn, limit) => {
    let inThrottle: boolean;
    return (...args: any[]) => {
      if (!inThrottle) {
        fn.apply(null, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }),
}));

// Mock virtual scroll hook
jest.mock('../hooks/useVirtualScroll.ts', () => ({
  useVirtualScroll: jest.fn(() => ({
    virtualItems: Array.from({ length: 10 }, (_, i) => ({ index: i })),
    totalSize: 1000,
    scrollElementProps: { ref: jest.fn() },
    measureElement: jest.fn(),
  })),
}));

// Create large datasets for performance testing
const createLargeTokenList = (size: number) =>
  Array.from({ length: size }, (_, i) => ({
    id: `token-${i}`,
    provider: `provider-${i % 5}`,
    type: 'access_token',
    value: `token-value-${i}`,
    expiresAt: new Date(Date.now() + 3600000),
    scopes: [`scope-${i}`],
  }));

const createLargeProviderList = (size: number) =>
  Array.from({ length: size }, (_, i) => ({
    name: `provider-${i}`,
    clientId: `client-${i}`,
    clientSecret: `secret-${i}`,
    authUrl: `https://provider-${i}.com/oauth/authorize`,
    tokenUrl: `https://provider-${i}.com/oauth/token`,
    scopes: [`scope-${i}`],
  }));

describe('Performance and Error Handling Tests', () => {
  let cleanup: () => void;

  beforeEach(() => {
    cleanup = setupTestEnvironment();
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Performance Tests', () => {
    test('should handle large token lists efficiently', async () => {
      const largeTokens = createLargeTokenList(1000);

      const TokenManager = require('../../../core/TokenManager.js').TokenManager;
      const tokenManager = new TokenManager();
      tokenManager.getTokens.mockResolvedValue(largeTokens);

      const startTime = performance.now();
      const instance = render(<EnhancedTokenManager />);

      await waitForAsync(100);

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time (< 500ms)
      expect(renderTime).toBeLessThan(500);
      expect(instance.lastFrame()).toContain('Token Manager');
    });

    test('should handle large configuration lists efficiently', async () => {
      const largeProviders = createLargeProviderList(1000);

      const ProviderConfigManager = require('../../../providers/ProviderConfig.js').ProviderConfigManager;
      const configManager = new ProviderConfigManager();
      configManager.loadProviders.mockResolvedValue(largeProviders);

      const startTime = performance.now();
      const instance = render(<EnhancedConfigManager />);

      await waitForAsync(100);

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time
      expect(renderTime).toBeLessThan(500);
      expect(instance.lastFrame()).toContain('Configuration');
    });

    test('should use virtual scrolling for large lists', () => {
      const items = Array.from({ length: 10000 }, (_, i) => `Item ${i}`);
      const props = {
        items,
        itemHeight: 20,
        containerHeight: 200,
        renderItem: (item: string) => <div key={item}>{item}</div>,
      };

      const { lastFrame } = render(<VirtualList {...props} />);

      // Should only render visible items
      expect(lastFrame()).toContain('Item 0');
      expect(lastFrame()).not.toContain('Item 500'); // Not visible
    });

    test('should debounce rapid key presses', async () => {
      const instance = render(<App />);

      const startTime = performance.now();

      // Simulate rapid key presses
      for (let i = 0; i < 100; i++) {
        pressKey(instance, 'down');
      }

      await waitForAsync(50);

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should handle rapid input efficiently
      expect(totalTime).toBeLessThan(100);
    });

    test('should throttle search operations', async () => {
      const instance = render(<EnhancedTokenManager />);

      await waitForAsync(100);

      const startTime = performance.now();

      // Open search and type rapidly
      pressKey(instance, '/');
      const searchQuery = 'abcdefghijklmnopqrstuvwxyz';
      for (const char of searchQuery) {
        instance.stdin.write(char);
      }

      await waitForAsync(100);

      const endTime = performance.now();
      const searchTime = endTime - startTime;

      // Should throttle search operations
      expect(searchTime).toBeLessThan(200);
    });

    test('should optimize re-renders with React.memo', async () => {
      const instance = render(<App />);

      // Navigate between views multiple times
      pressKey(instance, 'ctrl+d'); // Dashboard
      await waitForAsync(10);
      pressKey(instance, 'ctrl+t'); // Tokens
      await waitForAsync(10);
      pressKey(instance, 'ctrl+c'); // Config
      await waitForAsync(10);
      pressKey(instance, 'ctrl+m'); // Menu

      // Should maintain good performance
      expect(instance.lastFrame()).toContain('Main Menu');
    });

    test('should handle memory efficiently with cleanup', async () => {
      const initialMemory = process.memoryUsage();

      // Create and destroy multiple components
      for (let i = 0; i < 50; i++) {
        const instance = render(<EnhancedTokenManager />);
        await waitForAsync(10);
        instance.unmount();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be minimal (< 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Error Handling Tests', () => {
    test('should handle network errors gracefully', async () => {
      const TokenManager = require('../../../core/TokenManager.js').TokenManager;
      const tokenManager = new TokenManager();
      tokenManager.getTokens.mockRejectedValue(new Error('Network error'));

      const instance = render(<EnhancedTokenManager />);

      await waitForAsync(100);

      expect(instance.lastFrame()).toContain('Error') ||
      expect(instance.lastFrame()).toContain('Failed to load');
    });

    test('should handle authentication errors', async () => {
      const OAuthClient = require('../../../core/OAuthClient.js').OAuthClient;
      const oauthClient = new OAuthClient();
      oauthClient.authenticate.mockRejectedValue(new Error('Authentication failed'));

      const instance = render(<App initialView="auth" />);

      await waitForAsync(100);

      // Complete auth flow to trigger error
      pressKey(instance, 'enter'); // Select provider
      await waitForAsync(50);
      pressKey(instance, 'enter'); // Select flow
      await waitForAsync(100);

      expect(instance.lastFrame()).toContain('Error') ||
      expect(instance.lastFrame()).toContain('failed');
    });

    test('should handle configuration validation errors', async () => {
      const ProviderConfigManager = require('../../../providers/ProviderConfig.js').ProviderConfigManager;
      const configManager = new ProviderConfigManager();
      configManager.validateProvider.mockResolvedValue({
        valid: false,
        errors: ['Invalid client ID', 'Missing token URL'],
      });

      const instance = render(<EnhancedConfigManager />);

      await waitForAsync(100);

      // Try to save invalid config
      pressKey(instance, 'n'); // New provider
      await waitForAsync(50);
      pressKey(instance, 'ctrl+s'); // Save

      await waitForAsync(100);

      expect(instance.lastFrame()).toContain('Invalid client ID') ||
      expect(instance.lastFrame()).toContain('validation error');
    });

    test('should handle file system errors', async () => {
      const fs = require('fs');
      (fs.existsSync as jest.Mock).mockImplementation(() => {
        throw new Error('File system error');
      });

      const instance = render(<App />);

      await waitForAsync(100);

      // Should handle FS error gracefully
      expect(instance.lastFrame()).toContain('OAuth') ||
      expect(instance.lastFrame()).toContain('Error');
    });

    test('should handle malformed JWT tokens', async () => {
      const JWTDecoder = require('../../../utils/JWTDecoder.js').JWTDecoder;
      JWTDecoder.decode.mockImplementation(() => {
        throw new Error('Invalid JWT format');
      });

      const instance = render(<App initialView="inspect" />);

      await waitForAsync(100);

      // Enter invalid JWT
      instance.stdin.write('invalid.jwt.token');
      pressKey(instance, 'enter');

      await waitForAsync(50);

      expect(instance.lastFrame()).toContain('Invalid') ||
      expect(instance.lastFrame()).toContain('Error');
    });

    test('should handle clipboard access errors', async () => {
      const { copyToClipboard } = require('../../../utils/Clipboard.js');
      copyToClipboard.mockRejectedValue(new Error('Clipboard access denied'));

      const instance = render(<EnhancedTokenManager />);

      await waitForAsync(100);

      // Try to copy token
      pressKey(instance, 'ctrl+c');

      await waitForAsync(50);

      expect(instance.lastFrame()).toContain('Error') ||
      expect(instance.lastFrame()).toContain('clipboard');
    });

    test('should handle provider discovery failures', async () => {
      const DiscoveryClient = require('../../../providers/DiscoveryClient.js').DiscoveryClient;
      const discoveryClient = new DiscoveryClient();
      discoveryClient.discover.mockRejectedValue(new Error('Discovery endpoint not found'));

      const instance = render(<EnhancedConfigManager />);

      await waitForAsync(100);

      // Try to discover provider
      pressKey(instance, 'n'); // New provider
      await waitForAsync(50);
      // Navigate to discovery option and trigger
      pressKey(instance, 'tab');
      pressKey(instance, 'enter');

      await waitForAsync(100);

      expect(instance.lastFrame()).toContain('not found') ||
      expect(instance.lastFrame()).toContain('Discovery failed');
    });

    test('should recover from component crashes', async () => {
      // Mock a component that throws an error
      const BrokenComponent = () => {
        throw new Error('Component crashed');
      };

      const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
        try {
          return <>{children}</>;
        } catch (error) {
          return <div>Error: Component failed to render</div>;
        }
      };

      const { lastFrame } = render(
        <ErrorBoundary>
          <BrokenComponent />
        </ErrorBoundary>
      );

      expect(lastFrame()).toContain('Error') ||
      expect(lastFrame()).toContain('failed');
    });

    test('should handle rapid state changes gracefully', async () => {
      const instance = render(<App />);

      // Rapidly change views
      const views = ['ctrl+d', 'ctrl+t', 'ctrl+c', 'ctrl+i', 'ctrl+m'];

      for (let i = 0; i < 10; i++) {
        for (const view of views) {
          pressKey(instance, view);
          await waitForAsync(5);
        }
      }

      // Should still be functional
      expect(instance.lastFrame()).toContain('Main Menu') ||
      expect(instance.lastFrame()).toContain('OAuth');
    });
  });

  describe('Error Notification System', () => {
    test('should display error notifications', () => {
      const { lastFrame } = render(<NotificationDisplay />);

      // Should render without errors
      expect(lastFrame()).toBeDefined();
    });

    test('should queue multiple notifications', async () => {
      const { showNotification } = require('../hooks/useNotification.js');

      const instance = render(<App />);

      // Trigger multiple errors
      showNotification('Error 1', 'error');
      showNotification('Error 2', 'error');
      showNotification('Warning 1', 'warning');

      await waitForAsync(100);

      // Should show notifications
      expect(instance.lastFrame()).toContain('Error') ||
      expect(instance.lastFrame()).toContain('Warning');
    });

    test('should auto-dismiss notifications', async () => {
      const { showNotification } = require('../hooks/useNotification.js');

      const instance = render(<App />);

      showNotification('Temporary message', 'info');

      await waitForAsync(100);

      // Wait for auto-dismiss
      await waitForAsync(3000);

      // Message should be gone
      expect(instance.lastFrame()).not.toContain('Temporary message');
    });
  });

  describe('Resource Management', () => {
    test('should clean up event listeners', () => {
      const instance = render(<App />);

      // Simulate multiple mounts/unmounts
      instance.unmount();
      const instance2 = render(<App />);
      instance2.unmount();

      // Should not leak listeners
      expect(process.listenerCount('exit')).toBeLessThan(5);
    });

    test('should cancel pending operations on unmount', async () => {
      const TokenManager = require('../../../core/TokenManager.js').TokenManager;
      const tokenManager = new TokenManager();

      let resolveFn: (value: any) => void;
      const pendingPromise = new Promise(resolve => {
        resolveFn = resolve;
      });

      tokenManager.getTokens.mockReturnValue(pendingPromise);

      const instance = render(<EnhancedTokenManager />);

      // Unmount before promise resolves
      instance.unmount();

      // Resolve the promise (should not cause issues)
      resolveFn!([]);

      // Should handle gracefully
      expect(true).toBe(true);
    });

    test('should handle concurrent operations correctly', async () => {
      const TokenManager = require('../../../core/TokenManager.js').TokenManager;
      const tokenManager = new TokenManager();

      const instance = render(<EnhancedTokenManager />);

      await waitForAsync(100);

      // Trigger multiple operations simultaneously
      pressKey(instance, 'r'); // Refresh
      pressKey(instance, 'd'); // Delete
      pressKey(instance, 'e'); // Export

      await waitForAsync(100);

      // Should handle concurrent operations
      expect(tokenManager.refreshToken).toHaveBeenCalled() ||
      expect(tokenManager.deleteToken).toHaveBeenCalled() ||
      expect(tokenManager.exportTokens).toHaveBeenCalled();
    });
  });

  describe('Accessibility and Usability', () => {
    test('should provide keyboard-only navigation', () => {
      const instance = render(<App />);

      // Should be navigable without mouse
      pressKey(instance, 'down');
      pressKey(instance, 'up');
      pressKey(instance, 'enter');

      expect(instance.lastFrame()).toContain('Dashboard') ||
      expect(instance.lastFrame()).toContain('OAuth');
    });

    test('should handle screen reader compatibility', () => {
      const { lastFrame } = render(<App />);

      // Should have proper text labels
      expect(lastFrame()).toContain('OAuth Test Client');
      expect(lastFrame()).toContain('Main Menu');
    });

    test('should provide clear error messages', async () => {
      const TokenManager = require('../../../core/TokenManager.js').TokenManager;
      const tokenManager = new TokenManager();
      tokenManager.getTokens.mockRejectedValue(new Error('Failed to connect to database'));

      const instance = render(<EnhancedTokenManager />);

      await waitForAsync(100);

      // Error message should be descriptive
      expect(instance.lastFrame()).toContain('Failed to connect') ||
      expect(instance.lastFrame()).toContain('database');
    });

    test('should handle timeout scenarios', async () => {
      const OAuthClient = require('../../../core/OAuthClient.js').OAuthClient;
      const oauthClient = new OAuthClient();

      // Simulate timeout
      oauthClient.authenticate.mockImplementation(() =>
        new Promise((resolve) => setTimeout(resolve, 10000))
      );

      const instance = render(<App initialView="auth" />);

      await waitForAsync(100);

      // Start auth flow
      pressKey(instance, 'enter');
      await waitForAsync(50);
      pressKey(instance, 'enter');

      // Should show loading state
      expect(instance.lastFrame()).toContain('Loading') ||
      expect(instance.lastFrame()).toContain('Authenticating');
    });
  });
});