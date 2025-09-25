import React, { useState } from 'react';
import { Box, Text, useApp } from 'ink';
import Gradient from 'ink-gradient';
import { useKeyboard } from '../hooks/useKeyboard.js';
import { useNotification } from '../hooks/useNotification.js';

export type MenuOption = {
  label: string;
  value: string;
  icon: string;
  description?: string;
  shortcut?: string;
  disabled?: boolean;
};

interface MainMenuProps {
  onSelect: (value: string) => void;
  hasConfig?: boolean;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onSelect, hasConfig = false }) => {
  const { exit } = useApp();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { showNotification } = useNotification();

  const menuOptions: MenuOption[] = [
    {
      label: 'Dashboard',
      value: 'dashboard',
      icon: '📊',
      description: 'View system status and metrics',
      shortcut: 'd'
    },
    {
      label: 'Authenticate',
      value: 'auth',
      icon: '🔐',
      description: 'Configure and test OAuth authentication',
      shortcut: 'a',
      disabled: !hasConfig
    },
    {
      label: 'View Tokens',
      value: 'tokens',
      icon: '🎫',
      description: 'View and manage stored tokens',
      shortcut: 't'
    },
    {
      label: 'Configuration',
      value: 'config',
      icon: '⚙️',
      description: 'Manage OAuth provider configurations',
      shortcut: 'c'
    },
    {
      label: 'Inspect Token',
      value: 'inspect',
      icon: '🔍',
      description: 'Decode and inspect JWT tokens',
      shortcut: 'i'
    },
    {
      label: 'Help',
      value: 'help',
      icon: '❓',
      description: 'Show help and keyboard shortcuts',
      shortcut: 'h'
    },
    {
      label: 'Exit',
      value: 'exit',
      icon: '❌',
      description: 'Exit the application',
      shortcut: 'q'
    },
  ];

  const availableOptions = menuOptions.filter(opt => !opt.disabled);

  const handleSelect = (option: MenuOption) => {
    if (option.disabled) {
      showNotification('This option requires configuration', 'warning');
      return;
    }

    if (option.value === 'exit') {
      exit();
    } else {
      onSelect(option.value);
    }
  };

  // Handle keyboard shortcuts
  useKeyboard({
    shortcuts: {
      up: () => {
        setSelectedIndex(prev => (prev - 1 + availableOptions.length) % availableOptions.length);
      },
      down: () => {
        setSelectedIndex(prev => (prev + 1) % availableOptions.length);
      },
      enter: () => {
        handleSelect(availableOptions[selectedIndex]);
      },
      ...availableOptions.reduce((acc, option) => {
        if (option.shortcut) {
          acc[option.shortcut] = () => handleSelect(option);
        }
        return acc;
      }, {} as Record<string, () => void>),
    },
    enabled: true
  });

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box marginBottom={1} flexDirection="column">
        <Box justifyContent="center" marginBottom={1}>
          <Gradient name="rainbow">
            <Text bold>OAuth Test Client</Text>
          </Gradient>
        </Box>
        <Box justifyContent="center">
          <Text dimColor>Main Menu - Use arrow keys or shortcuts to navigate</Text>
        </Box>
      </Box>

      {!hasConfig && (
        <Box marginBottom={1} borderStyle="round" borderColor="yellow" paddingX={1}>
          <Text color="yellow">⚠️  No configuration found. Please configure a provider first.</Text>
        </Box>
      )}

      <Box flexDirection="column">
        {availableOptions.map((option, index) => {
          const isSelected = index === selectedIndex;
          return (
            <Box key={option.value} flexDirection="row" marginBottom={1}>
              <Box width={3}>
                <Text>{isSelected ? '▶' : ' '}</Text>
              </Box>
              <Box width={3}>
                <Text>{option.icon}</Text>
              </Box>
              <Box width={20}>
                <Text
                  color={isSelected ? 'cyan' : undefined}
                  bold={isSelected}
                >
                  {option.label}
                </Text>
              </Box>
              {option.shortcut && (
                <Box marginLeft={2}>
                  <Text dimColor>[{option.shortcut}]</Text>
                </Box>
              )}
              {isSelected && option.description && (
                <Box marginLeft={2}>
                  <Text dimColor>{option.description}</Text>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text dimColor>Press ? for help • ESC to go back • q to quit</Text>
      </Box>
    </Box>
  );
};