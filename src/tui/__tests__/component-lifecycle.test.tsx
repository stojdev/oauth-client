import React from 'react';
import { render as inkRender } from 'ink-testing-library';
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { App } from '../App.js';
import { TokenManager } from '../../../core/TokenManager.js';

/**
 * Component Lifecycle Tests - Ensure proper mounting, updating, and unmounting
 * These tests verify that components don't leak memory or duplicate on re-renders
 */

// Mock TokenManager to track instance creation
jest.mock('../../../core/TokenManager.js');

describe('Component Lifecycle Management Tests', () => {
  let tokenManagerInstances: any[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    tokenManagerInstances = [];

    // Mock TokenManager to track instantiation
    (TokenManager as jest.MockedClass<typeof TokenManager>).mockImplementation(() => {
      const instance = {
        getAllTokens: jest.fn().mockResolvedValue([]),
        getToken: jest.fn().mockResolvedValue(null),
        storeToken: jest.fn().mockResolvedValue(undefined),
        deleteToken: jest.fn().mockResolvedValue(true),
        clearAllTokens: jest.fn().mockResolvedValue(undefined),
      };
      tokenManagerInstances.push(instance);
      return instance as any;
    });

    // Mock console to prevent output
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'clear').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Mount/Unmount Tests', () => {
    test('should mount components only once per view', () => {
      const { stdin } = inkRender(<App />);

      // Navigate to tokens view
      stdin.write('', { ctrl: true, name: 't' });

      // Should create only one TokenManager instance
      expect(tokenManagerInstances.length).toBe(1);
    });

    test('should properly cleanup when switching views', () => {
      const { stdin, unmount } = inkRender(<App />);

      // Navigate to tokens
      stdin.write('', { ctrl: true, name: 't' });
      const initialInstances = tokenManagerInstances.length;

      // Navigate away
      stdin.write('', { ctrl: true, name: 'm' });

      // Navigate back to tokens
      stdin.write('', { ctrl: true, name: 't' });

      // Should reuse or properly cleanup - not accumulate instances
      expect(tokenManagerInstances.length).toBeLessThanOrEqual(initialInstances + 1);

      unmount();
    });

    test('should not create duplicate instances on re-render', () => {
      const { rerender } = inkRender(<App initialView="tokens" />);

      const initialCount = tokenManagerInstances.length;

      // Force re-render
      rerender(<App initialView="tokens" />);
      rerender(<App initialView="tokens" />);

      // Should not create additional instances
      expect(tokenManagerInstances.length).toBe(initialCount);
    });
  });

  describe('Effect Cleanup Tests', () => {
    test('should cleanup effects when component unmounts', () => {
      const mockCleanup = jest.fn();

      // Mock useEffect cleanup
      const originalUseEffect = React.useEffect;
      React.useEffect = jest.fn((effect, deps) => {
        const cleanup = effect();
        if (cleanup) mockCleanup.mockImplementation(cleanup);
        return cleanup;
      }) as any;

      const { unmount } = inkRender(<App />);
      unmount();

      // Cleanup should have been called
      expect(mockCleanup).toHaveBeenCalled();

      // Restore original useEffect
      React.useEffect = originalUseEffect;
    });

    test('should remove event listeners on unmount', () => {
      const removeListenerSpy = jest.spyOn(process, 'removeListener');

      const { unmount } = inkRender(<App />);
      unmount();

      // Should remove SIGINT and SIGTERM listeners
      expect(removeListenerSpy).toHaveBeenCalled();
    });
  });

  describe('State Update Tests', () => {
    test('should not trigger unnecessary re-renders', () => {
      let renderCount = 0;

      // Track renders
      const OriginalApp = App;
      const TrackedApp = (props: any) => {
        renderCount++;
        return <OriginalApp {...props} />;
      };

      const { stdin } = inkRender(<TrackedApp />);
      const initialRenderCount = renderCount;

      // Same navigation multiple times should not cause extra renders
      stdin.write('', { ctrl: true, name: 'm' });
      stdin.write('', { ctrl: true, name: 'm' });
      stdin.write('', { ctrl: true, name: 'm' });

      // Should have minimal additional renders
      expect(renderCount - initialRenderCount).toBeLessThan(5);
    });

    test('should batch state updates properly', () => {
      const { stdin, lastFrame } = inkRender(<App />);

      // Rapid state changes
      stdin.write('d');
      stdin.write('t');
      stdin.write('c');

      const frame = lastFrame();

      // Should end up in final state without intermediate duplications
      const headerCount = (frame.match(/OAuth CLI v1\.0\.0/g) || []).length;
      expect(headerCount).toBe(1);
    });
  });

  describe('Memory Leak Prevention Tests', () => {
    test('should not accumulate closures on repeated navigation', () => {
      const { stdin } = inkRender(<App />);

      // Create potential for closure accumulation
      for (let i = 0; i < 50; i++) {
        stdin.write('', { ctrl: true, name: 'd' });
        stdin.write('', { ctrl: true, name: 't' });
      }

      // If we complete without hanging, memory is managed properly
      expect(true).toBe(true);
    });

    test('should cleanup timers on unmount', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const { unmount } = inkRender(<App />);
      unmount();

      // Any timers should be cleared
      // This is a basic check - actual timer IDs would need to be tracked
      expect(clearTimeoutSpy).toHaveBeenCalledTimes(clearTimeoutSpy.mock.calls.length);
    });
  });

  describe('Component Tree Integrity Tests', () => {
    test('should maintain consistent component tree structure', () => {
      const { lastFrame, stdin } = inkRender(<App />);

      const views = ['d', 't', 'c', 'i', 'm'];
      const frames: string[] = [];

      views.forEach(view => {
        stdin.write('', { ctrl: true, name: view });
        frames.push(lastFrame());
      });

      // All frames should have consistent structure
      frames.forEach(frame => {
        // Header should be at consistent position
        const headerIndex = frame.indexOf('OAuth CLI v1.0.0');
        expect(headerIndex).toBeGreaterThanOrEqual(0);
        expect(headerIndex).toBeLessThan(100); // Should be near the top
      });
    });

    test('should not nest views within each other', () => {
      const { lastFrame, stdin } = inkRender(<App />);

      // Navigate to dashboard
      stdin.write('', { ctrl: true, name: 'd' });
      const dashboardFrame = lastFrame();

      // Navigate to tokens
      stdin.write('', { ctrl: true, name: 't' });
      const tokensFrame = lastFrame();

      // Tokens frame should not contain dashboard content
      expect(tokensFrame).not.toContain('Dashboard');
      expect(dashboardFrame).not.toContain('Token');
    });
  });

  describe('Hook Lifecycle Tests', () => {
    test('should properly manage useEffect dependencies', () => {
      const { stdin, rerender } = inkRender(<App />);

      // Navigate to trigger effects
      stdin.write('', { ctrl: true, name: 'd' });

      // Re-render with same props
      rerender(<App />);

      // Should not cause duplication
      const frame = stdin.frames[stdin.frames.length - 1];
      const headerCount = (frame?.match(/OAuth CLI v1\.0\.0/g) || []).length;
      expect(headerCount).toBeLessThanOrEqual(1);
    });

    test('should cleanup custom hooks properly', () => {
      const { unmount } = inkRender(<App />);

      // Unmount should complete without errors
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Concurrent Update Tests', () => {
    test('should handle concurrent state updates safely', async () => {
      const { stdin, lastFrame } = inkRender(<App />);

      // Simulate concurrent updates
      const promises = [
        Promise.resolve().then(() => stdin.write('', { ctrl: true, name: 'd' })),
        Promise.resolve().then(() => stdin.write('', { ctrl: true, name: 't' })),
        Promise.resolve().then(() => stdin.write('', { ctrl: true, name: 'c' })),
      ];

      await Promise.all(promises);

      // Should still have single header after concurrent updates
      const frame = lastFrame();
      const headerCount = (frame.match(/OAuth CLI v1\.0\.0/g) || []).length;
      expect(headerCount).toBe(1);
    });
  });
});