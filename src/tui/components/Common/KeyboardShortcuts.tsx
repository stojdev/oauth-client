import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { useKeyboard } from '../../hooks/useKeyboard.js';

export interface ShortcutItem {
  key: string;
  description: string;
  context?: string;
}

export interface ShortcutCategory {
  name: string;
  description?: string;
  shortcuts: ShortcutItem[];
}

interface KeyboardShortcutsProps {
  categories?: ShortcutCategory[];
  selectedCategory?: number;
  onCategoryChange?: (index: number) => void;
  onClose?: () => void;
  showCategoryNavigation?: boolean;
  maxHeight?: number;
}

const DEFAULT_CATEGORIES: ShortcutCategory[] = [
  {
    name: 'Global Navigation',
    description: 'Available from anywhere in the application',
    shortcuts: [
      { key: 'ESC', description: 'Go back or close current view' },
      { key: 'q', description: 'Quit application (from main menu)' },
      { key: '? or h', description: 'Show help' },
      { key: 'Ctrl+M', description: 'Return to main menu' },
      { key: 'Ctrl+D', description: 'Jump to dashboard' },
      { key: 'Ctrl+L', description: 'Clear screen and refresh' },
    ],
  },
  {
    name: 'Menu Navigation',
    description: 'Navigate through menus and lists',
    shortcuts: [
      { key: '↑/↓ or j/k', description: 'Move up/down in lists' },
      { key: '←/→ or h/l', description: 'Move left/right or navigate tabs' },
      { key: 'Enter or Space', description: 'Select item or confirm action' },
      { key: 'Tab', description: 'Next field or focus area' },
      { key: 'Shift+Tab', description: 'Previous field or focus area' },
      { key: 'Home/End', description: 'Go to first/last item' },
      { key: 'Page Up/Down', description: 'Scroll page up/down' },
    ],
  },
  {
    name: 'Authentication Flows',
    description: 'Shortcuts for OAuth authentication',
    shortcuts: [
      { key: 'Ctrl+A', description: 'Open authentication wizard' },
      { key: '1-6', description: 'Quick select grant type (Auth Code, Client Creds, etc.)' },
      { key: 'Ctrl+S', description: 'Save current configuration' },
      { key: 'Ctrl+T', description: 'Test current configuration' },
      { key: 'r', description: 'Refresh or retry authentication' },
      { key: 'c', description: 'Copy authorization URL to clipboard' },
    ],
  },
  {
    name: 'Token Management',
    description: 'Manage and inspect tokens',
    shortcuts: [
      { key: 'Ctrl+T', description: 'Open token manager' },
      { key: 'Space', description: 'Select/deselect token' },
      { key: 'Delete or d', description: 'Delete selected tokens' },
      { key: 'r', description: 'Refresh selected token' },
      { key: 'v or Enter', description: 'View token details' },
      { key: 'i', description: 'Inspect token (JWT decoder)' },
      { key: 'c', description: 'Copy token to clipboard' },
      { key: 'e', description: 'Export tokens to file' },
    ],
  },
  {
    name: 'Configuration Management',
    description: 'Provider and client configuration',
    shortcuts: [
      { key: 'Ctrl+C', description: 'Open configuration manager' },
      { key: 'n', description: 'Create new provider configuration' },
      { key: 'e', description: 'Edit selected configuration' },
      { key: 'Delete', description: 'Delete selected configuration' },
      { key: 't', description: 'Test configuration connectivity' },
      { key: 'd', description: 'Discover provider configuration' },
      { key: 's', description: 'Save configuration' },
      { key: 'Ctrl+I', description: 'Import configuration from file' },
      { key: 'Ctrl+E', description: 'Export configuration to file' },
    ],
  },
  {
    name: 'Inspector & Debug',
    description: 'Token inspection and debugging tools',
    shortcuts: [
      { key: 'Ctrl+I', description: 'Open token inspector' },
      { key: 'j', description: 'Toggle JWT decode view' },
      { key: 'h', description: 'Toggle headers view' },
      { key: 'p', description: 'Toggle payload view' },
      { key: 'v', description: 'Toggle verification status' },
      { key: 'f', description: 'Format JSON output' },
      { key: 'Ctrl+F', description: 'Search within token content' },
    ],
  },
  {
    name: 'Form Controls',
    description: 'Working with input forms',
    shortcuts: [
      { key: 'Tab', description: 'Next form field' },
      { key: 'Shift+Tab', description: 'Previous form field' },
      { key: 'Ctrl+A', description: 'Select all text in field' },
      { key: 'Ctrl+U', description: 'Clear current field' },
      { key: 'Enter', description: 'Submit form or confirm' },
      { key: 'ESC', description: 'Cancel form or clear field' },
    ],
  },
  {
    name: 'Advanced Features',
    description: 'Power user shortcuts',
    shortcuts: [
      { key: 'Ctrl+R', description: 'Refresh current view' },
      { key: 'Ctrl+N', description: 'New session or configuration' },
      { key: 'Ctrl+O', description: 'Open file or configuration' },
      { key: 'Ctrl+W', description: 'Close current tab or view' },
      { key: 'Ctrl+Q', description: 'Quick exit application' },
      { key: 'F1', description: 'Context-sensitive help' },
      { key: 'F5', description: 'Full refresh' },
      { key: 'F12', description: 'Developer tools (if available)' },
    ],
  },
];

export const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({
  categories = DEFAULT_CATEGORIES,
  selectedCategory: initialSelectedCategory = 0,
  onCategoryChange,
  onClose,
  showCategoryNavigation = true,
  maxHeight = 20,
}) => {
  const [selectedCategory, setSelectedCategory] = useState(initialSelectedCategory);
  const [scrollOffset, setScrollOffset] = useState(0);

  const handleCategoryChange = (newIndex: number) => {
    const clampedIndex = Math.max(0, Math.min(categories.length - 1, newIndex));
    setSelectedCategory(clampedIndex);
    setScrollOffset(0);
    onCategoryChange?.(clampedIndex);
  };

  useKeyboard({
    shortcuts: {
      'left': () => showCategoryNavigation && handleCategoryChange(selectedCategory - 1),
      'right': () => showCategoryNavigation && handleCategoryChange(selectedCategory + 1),
      'h': () => showCategoryNavigation && handleCategoryChange(selectedCategory - 1),
      'l': () => showCategoryNavigation && handleCategoryChange(selectedCategory + 1),
      'up': () => setScrollOffset(Math.max(0, scrollOffset - 1)),
      'down': () => setScrollOffset(scrollOffset + 1),
      'j': () => setScrollOffset(scrollOffset + 1),
      'k': () => setScrollOffset(Math.max(0, scrollOffset - 1)),
      'escape': () => onClose?.(),
      'q': () => onClose?.(),
      '1': () => handleCategoryChange(0),
      '2': () => handleCategoryChange(1),
      '3': () => handleCategoryChange(2),
      '4': () => handleCategoryChange(3),
      '5': () => handleCategoryChange(4),
      '6': () => handleCategoryChange(5),
      '7': () => handleCategoryChange(6),
      '8': () => handleCategoryChange(7),
    },
  });

  const currentCategory = categories[selectedCategory];
  const visibleShortcuts = currentCategory?.shortcuts.slice(
    scrollOffset,
    scrollOffset + maxHeight - 4
  ) || [];
  const hasMore = (currentCategory?.shortcuts.length || 0) > scrollOffset + maxHeight - 4;

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="cyan" paddingX={2} paddingY={1}>
      {/* Header */}
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color="cyan">Keyboard Shortcuts Reference</Text>
      </Box>

      {/* Category Navigation */}
      {showCategoryNavigation && categories.length > 1 && (
        <Box flexDirection="column" marginBottom={1}>
          <Box justifyContent="center" marginBottom={1}>
            <Text dimColor>Use ←/→ or h/l to switch categories, 1-8 for quick access</Text>
          </Box>
          <Box justifyContent="center" gap={1}>
            {categories.map((category, index) => (
              <Box key={category.name}>
                <Text
                  color={index === selectedCategory ? 'yellow' : 'gray'}
                  bold={index === selectedCategory}
                  dimColor={index !== selectedCategory}
                >
                  {index + 1}. {category.name}
                </Text>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Current Category */}
      {currentCategory && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text color="yellow" bold>{currentCategory.name}</Text>
            {currentCategory.description && (
              <Text dimColor> - {currentCategory.description}</Text>
            )}
          </Box>

          {/* Shortcuts List */}
          <Box flexDirection="column">
            {visibleShortcuts.map((shortcut, index) => (
              <Box key={`${shortcut.key}-${index}`} marginY={0} paddingX={1}>
                <Box width={20} justifyContent="flex-end">
                  <Text color="green" bold>{shortcut.key}</Text>
                </Box>
                <Box marginX={2}>
                  <Text color="gray">•</Text>
                </Box>
                <Box flexGrow={1}>
                  <Text>{shortcut.description}</Text>
                  {shortcut.context && (
                    <Text dimColor color="gray"> ({shortcut.context})</Text>
                  )}
                </Box>
              </Box>
            ))}

            {/* Scroll indicator */}
            {scrollOffset > 0 && (
              <Box justifyContent="center" marginTop={1}>
                <Text dimColor>↑ More shortcuts above (use ↑/k to scroll)</Text>
              </Box>
            )}

            {hasMore && (
              <Box justifyContent="center" marginTop={1}>
                <Text dimColor>↓ More shortcuts below (use ↓/j to scroll)</Text>
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* Footer */}
      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Box flexGrow={1}>
          <Text dimColor>
            Press ESC or q to close • Use ↑/↓ or j/k to scroll
          </Text>
        </Box>
        {categories.length > 0 && (
          <Text dimColor>
            Category {selectedCategory + 1} of {categories.length}
          </Text>
        )}
      </Box>
    </Box>
  );
};