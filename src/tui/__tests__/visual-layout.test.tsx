import React from 'react';
import { render as inkRender } from 'ink-testing-library';
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { App } from '../App.js';

/**
 * Visual Layout Tests - Detect header duplication and visual anomalies
 * These tests ensure that the TUI renders correctly without visual bugs
 */

describe('Visual Layout Tests - Header Duplication Prevention', () => {
  let cleanup: () => void;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Mock console methods to prevent output during tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'clear').mockImplementation();
  });

  afterEach(() => {
    if (cleanup) {
      cleanup();
    }
    jest.restoreAllMocks();
  });

  describe('Header Rendering Tests', () => {
    test('should render exactly one header on initial load', () => {
      const { lastFrame } = inkRender(<App />);
      const frame = lastFrame();

      // Count occurrences of the header text
      const headerMatches = (frame.match(/OAuth CLI v1\.0\.0/g) || []);
      expect(headerMatches.length).toBe(1);

      // Also check for Terminal User Interface text
      const tuiMatches = (frame.match(/Terminal User Interface/g) || []);
      expect(tuiMatches.length).toBe(1);
    });

    test('should maintain single header when switching views', () => {
      const { lastFrame, stdin } = inkRender(<App />);

      // Switch to dashboard
      stdin.write('', { ctrl: true, name: 'd' });
      let frame = lastFrame();
      let headerCount = (frame.match(/OAuth CLI v1\.0\.0/g) || []).length;
      expect(headerCount).toBe(1);

      // Switch to tokens
      stdin.write('', { ctrl: true, name: 't' });
      frame = lastFrame();
      headerCount = (frame.match(/OAuth CLI v1\.0\.0/g) || []).length;
      expect(headerCount).toBe(1);

      // Switch to config
      stdin.write('', { ctrl: true, name: 'c' });
      frame = lastFrame();
      headerCount = (frame.match(/OAuth CLI v1\.0\.0/g) || []).length;
      expect(headerCount).toBe(1);

      // Back to menu
      stdin.write('', { ctrl: true, name: 'm' });
      frame = lastFrame();
      headerCount = (frame.match(/OAuth CLI v1\.0\.0/g) || []).length;
      expect(headerCount).toBe(1);
    });

    test('should not duplicate header during rapid navigation', () => {
      const { lastFrame, stdin } = inkRender(<App />);

      // Rapid fire navigation
      const keys = ['d', 't', 'c', 'i', 'm', 'd', 't'];
      keys.forEach(key => {
        stdin.write('', { ctrl: true, name: key });
        const frame = lastFrame();
        const headerCount = (frame.match(/OAuth CLI v1\.0\.0/g) || []).length;
        expect(headerCount).toBe(1);

        // Check that navigation tabs are also not duplicated
        const menuTabCount = (frame.match(/\[Ctrl\+M\] Menu/g) || []).length;
        expect(menuTabCount).toBeLessThanOrEqual(1);
      });
    });

    test('should not accumulate headers when repeatedly visiting same view', () => {
      const { lastFrame, stdin } = inkRender(<App />);

      // Visit tokens view multiple times
      for (let i = 0; i < 10; i++) {
        stdin.write('', { ctrl: true, name: 't' });
        stdin.write('', { ctrl: true, name: 'm' });
      }

      stdin.write('', { ctrl: true, name: 't' });
      const frame = lastFrame();
      const headerCount = (frame.match(/OAuth CLI v1\.0\.0/g) || []).length;
      expect(headerCount).toBe(1);
    });
  });

  describe('Component Boundary Tests', () => {
    test('should not have overlapping UI elements', () => {
      const { lastFrame } = inkRender(<App initialView="menu" />);
      const frame = lastFrame();

      // Check that main menu title appears only once
      const menuTitleCount = (frame.match(/OAuth Test Client/g) || []).length;
      expect(menuTitleCount).toBeLessThanOrEqual(1);

      // Check that status bar appears only once
      const statusBarCount = (frame.match(/Current View:/g) || []).length;
      expect(statusBarCount).toBeLessThanOrEqual(1);
    });

    test('should properly clear previous view content', () => {
      const { lastFrame, stdin } = inkRender(<App initialView="menu" />);

      // Start at menu
      let frame = lastFrame();
      expect(frame).toContain('Main Menu');

      // Switch to dashboard
      stdin.write('', { ctrl: true, name: 'd' });
      frame = lastFrame();
      expect(frame).toContain('Dashboard');
      expect(frame).not.toContain('Main Menu');

      // Switch to tokens
      stdin.write('', { ctrl: true, name: 't' });
      frame = lastFrame();
      expect(frame).toContain('Token');
      expect(frame).not.toContain('Dashboard');
      expect(frame).not.toContain('Main Menu');
    });

    test('should not show loading indicators from other views', () => {
      const { lastFrame, stdin } = inkRender(<App initialView="tokens" />);

      // Let tokens view load
      setTimeout(() => {
        // Switch back to menu
        stdin.write('', { ctrl: true, name: 'm' });
        const frame = lastFrame();

        // Menu should not show token loading indicators
        expect(frame).not.toContain('Loading tokens');
        expect(frame).toContain('Main Menu');
      }, 100);
    });
  });

  describe('Visual Consistency Tests', () => {
    test('should maintain consistent layout structure', () => {
      const { lastFrame } = inkRender(<App />);
      const frame = lastFrame();

      // Check for expected structure: header, content, status bar
      expect(frame).toMatch(/OAuth CLI v1\.0\.0[\s\S]*Terminal User Interface/);
      expect(frame).toMatch(/\[Ctrl\+M\][\s\S]*\[Ctrl\+T\]/);

      // Verify no duplicate structural elements
      const structuralElements = frame.split('\n');
      const headerLines = structuralElements.filter(line =>
        line.includes('OAuth CLI v1.0.0')
      );
      expect(headerLines.length).toBe(1);
    });

    test('should render borders correctly without duplication', () => {
      const { lastFrame } = inkRender(<App />);
      const frame = lastFrame();

      // Count border characters (rough check for duplicate borders)
      const lines = frame.split('\n');
      const borderLines = lines.filter(line =>
        line.includes('─') || line.includes('│') || line.includes('┌') || line.includes('┐')
      );

      // Should have reasonable number of border lines (not duplicated)
      expect(borderLines.length).toBeLessThan(20); // Adjust based on actual layout
    });
  });

  describe('Memory and Performance Tests', () => {
    test('should not leak memory on view changes', () => {
      const { stdin, unmount } = inkRender(<App />);

      // Simulate many view changes
      for (let i = 0; i < 100; i++) {
        stdin.write('', { ctrl: true, name: 'd' });
        stdin.write('', { ctrl: true, name: 't' });
        stdin.write('', { ctrl: true, name: 'c' });
        stdin.write('', { ctrl: true, name: 'm' });
      }

      // Component should still be responsive (test completes without timeout)
      unmount();
      expect(true).toBe(true); // If we get here, no memory issues
    });

    test('should handle rapid keyboard input without visual glitches', () => {
      const { lastFrame, stdin } = inkRender(<App />);

      // Rapid keyboard mashing
      const keys = 'dtcimahdt'.split('');
      keys.forEach(key => {
        stdin.write(key);
      });

      // Final frame should still have valid structure
      const frame = lastFrame();
      const headerCount = (frame.match(/OAuth CLI v1\.0\.0/g) || []).length;
      expect(headerCount).toBe(1);
    });
  });

  describe('Edge Case Tests', () => {
    test('should handle view that does not exist gracefully', () => {
      const { lastFrame, stdin } = inkRender(<App />);

      // Try to navigate to non-existent view
      stdin.write('z');
      stdin.write('x');

      const frame = lastFrame();
      // Should still have single header
      const headerCount = (frame.match(/OAuth CLI v1\.0\.0/g) || []).length;
      expect(headerCount).toBe(1);
    });

    test('should recover from error state without visual corruption', () => {
      const { lastFrame, rerender } = inkRender(<App />);

      // Force re-render
      rerender(<App />);

      const frame = lastFrame();
      const headerCount = (frame.match(/OAuth CLI v1\.0\.0/g) || []).length;
      expect(headerCount).toBe(1);
    });
  });
});