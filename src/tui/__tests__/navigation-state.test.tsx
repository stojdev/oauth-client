import React from 'react';
import { render as inkRender } from 'ink-testing-library';
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { App } from '../App.js';

/**
 * Navigation State Tests - Ensure proper state management during navigation
 * These tests verify that navigation maintains consistent state without duplication
 */

describe('Navigation State Management Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'clear').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('State Consistency Tests', () => {
    test('should maintain single instance of active view', () => {
      const { lastFrame, stdin } = inkRender(<App />);

      // Navigate through all views
      const views = [
        { key: 'd', name: 'Dashboard' },
        { key: 'a', name: 'Auth' },
        { key: 't', name: 'Token' },
        { key: 'c', name: 'Config' },
        { key: 'i', name: 'Inspect' },
      ];

      views.forEach(view => {
        stdin.write('', { ctrl: true, name: view.key });
        const frame = lastFrame();

        // Check that only the current view's indicator is active (green)
        const activeIndicators = (frame.match(/\x1b\[32m/g) || []).length;
        // Should have limited number of active (green) elements
        expect(activeIndicators).toBeGreaterThan(0);
        expect(activeIndicators).toBeLessThan(10); // Reasonable upper limit
      });
    });

    test('should properly cleanup previous view state', () => {
      const { lastFrame, stdin } = inkRender(<App />);

      // Start at menu
      let frame = lastFrame();
      const initialMenuContent = frame.includes('Main Menu');
      expect(initialMenuContent).toBe(true);

      // Navigate to tokens
      stdin.write('t');
      frame = lastFrame();

      // Menu content should be completely gone
      expect(frame).not.toContain('Main Menu');
      expect(frame).not.toContain('Use arrow keys');

      // Navigate back to menu
      stdin.write('', { escape: true });
      frame = lastFrame();

      // Should be back at menu without tokens content
      expect(frame).toContain('Main Menu');
      expect(frame).not.toContain('No Tokens Stored');
    });

    test('should handle escape key navigation correctly', () => {
      const { lastFrame, stdin } = inkRender(<App initialView="menu" />);

      // Navigate deep into the app
      stdin.write('d'); // Dashboard
      stdin.write('', { ctrl: true, name: 't' }); // Tokens
      stdin.write('', { ctrl: true, name: 'c' }); // Config

      // Use escape to go back
      stdin.write('', { escape: true });
      const frame = lastFrame();

      // Should be at menu
      expect(frame).toContain('Main Menu');

      // No duplicate headers
      const headerCount = (frame.match(/OAuth CLI v1\.0\.0/g) || []).length;
      expect(headerCount).toBe(1);
    });
  });

  describe('Rapid Navigation Tests', () => {
    test('should handle rapid sequential navigation without duplication', () => {
      const { lastFrame, stdin } = inkRender(<App />);

      // Rapid navigation sequence
      const sequence = ['d', 't', 'c', 'i', 'm', 'd', 't', 'c'];
      sequence.forEach(key => {
        if (key === 'm') {
          stdin.write('', { ctrl: true, name: key });
        } else {
          stdin.write(key);
        }
      });

      const frame = lastFrame();
      const headerCount = (frame.match(/OAuth CLI v1\.0\.0/g) || []).length;
      expect(headerCount).toBe(1);

      // Check for duplicate menu items
      const dashboardCount = (frame.match(/\[Ctrl\+D\] Dashboard/g) || []).length;
      expect(dashboardCount).toBe(1);
    });

    test('should handle back-and-forth navigation', () => {
      const { lastFrame, stdin } = inkRender(<App />);

      // Go back and forth between two views many times
      for (let i = 0; i < 20; i++) {
        stdin.write('', { ctrl: true, name: 'd' });
        stdin.write('', { ctrl: true, name: 't' });
      }

      const frame = lastFrame();
      const headerCount = (frame.match(/OAuth CLI v1\.0\.0/g) || []).length;
      expect(headerCount).toBe(1);

      // Should be at tokens view (last navigation)
      expect(frame).toContain('Token');
    });

    test('should handle circular navigation pattern', () => {
      const { lastFrame, stdin } = inkRender(<App />);

      // Navigate in a circle multiple times
      for (let i = 0; i < 5; i++) {
        stdin.write('', { ctrl: true, name: 'd' });
        stdin.write('', { ctrl: true, name: 't' });
        stdin.write('', { ctrl: true, name: 'c' });
        stdin.write('', { ctrl: true, name: 'm' });
      }

      const frame = lastFrame();
      const headerCount = (frame.match(/OAuth CLI v1\.0\.0/g) || []).length;
      expect(headerCount).toBe(1);
    });
  });

  describe('Navigation History Tests', () => {
    test('should not accumulate navigation history in rendered output', () => {
      const { lastFrame, stdin } = inkRender(<App />);

      const navigationPath = [
        { key: 'd', expectedContent: 'Dashboard' },
        { key: 't', expectedContent: 'Token' },
        { key: 'c', expectedContent: 'Config' },
        { key: 'i', expectedContent: 'Inspect' },
      ];

      const previousContents: string[] = [];

      navigationPath.forEach(({ key, expectedContent }) => {
        stdin.write('', { ctrl: true, name: key });
        const frame = lastFrame();

        // Current view should be present
        expect(frame).toContain(expectedContent);

        // Previous views should not be present
        previousContents.forEach(prev => {
          if (prev !== expectedContent) {
            expect(frame).not.toContain(prev);
          }
        });

        previousContents.push(expectedContent);
      });
    });
  });

  describe('Keyboard Shortcut State Tests', () => {
    test('should respond to all documented keyboard shortcuts', () => {
      const { lastFrame, stdin } = inkRender(<App />);

      const shortcuts = [
        { keys: { ctrl: true, name: 'd' }, view: 'Dashboard' },
        { keys: { ctrl: true, name: 't' }, view: 'Token' },
        { keys: { ctrl: true, name: 'c' }, view: 'Config' },
        { keys: { ctrl: true, name: 'i' }, view: 'Inspect' },
        { keys: { ctrl: true, name: 'm' }, view: 'Menu' },
      ];

      shortcuts.forEach(({ keys, view }) => {
        stdin.write('', keys);
        const frame = lastFrame();

        // Should navigate to correct view
        expect(frame).toContain(view);

        // Should still have single header
        const headerCount = (frame.match(/OAuth CLI v1\.0\.0/g) || []).length;
        expect(headerCount).toBe(1);
      });
    });

    test('should handle help shortcut without view duplication', () => {
      const { lastFrame, stdin } = inkRender(<App />);

      // Trigger help
      stdin.write('?');
      let frame = lastFrame();

      // Should show help modal
      expect(frame).toContain('Help');

      // Close help
      stdin.write('', { escape: true });
      frame = lastFrame();

      // Should be back at previous view
      const headerCount = (frame.match(/OAuth CLI v1\.0\.0/g) || []).length;
      expect(headerCount).toBe(1);
    });
  });

  describe('View Transition Integrity Tests', () => {
    test('should complete view transitions atomically', () => {
      const { lastFrame, stdin } = inkRender(<App />);

      // Start transition monitoring
      const frames: string[] = [];

      // Capture frames during transitions
      stdin.write('', { ctrl: true, name: 'd' });
      frames.push(lastFrame());

      stdin.write('', { ctrl: true, name: 't' });
      frames.push(lastFrame());

      stdin.write('', { ctrl: true, name: 'c' });
      frames.push(lastFrame());

      // Each frame should have exactly one header
      frames.forEach((frame, index) => {
        const headerCount = (frame.match(/OAuth CLI v1\.0\.0/g) || []).length;
        expect(headerCount).toBe(1);
      });
    });

    test('should not show intermediate states during navigation', () => {
      const { lastFrame, stdin, rerender } = inkRender(<App />);

      // Navigate and immediately check
      stdin.write('', { ctrl: true, name: 'd' });
      const frame1 = lastFrame();

      // Force immediate re-render
      rerender(<App />);
      const frame2 = lastFrame();

      // Both frames should be consistent
      expect(frame1).toBe(frame2);

      // No duplication in either frame
      const headerCount1 = (frame1.match(/OAuth CLI v1\.0\.0/g) || []).length;
      const headerCount2 = (frame2.match(/OAuth CLI v1\.0\.0/g) || []).length;
      expect(headerCount1).toBe(1);
      expect(headerCount2).toBe(1);
    });
  });
});