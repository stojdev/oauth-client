import React from 'react';
import { Box, Text } from 'ink';
import type { View } from '../../App.js';

interface HeaderProps {
  activeView: View;
}

// Memoized tabs configuration to prevent recreation on every render
const TABS_CONFIG = [
  { view: 'menu' as View, label: 'Menu', shortcut: 'Ctrl+M' },
  { view: 'dashboard' as View, label: 'Dashboard', shortcut: 'Ctrl+D' },
  { view: 'auth' as View, label: 'Auth', shortcut: 'Ctrl+A' },
  { view: 'tokens' as View, label: 'Tokens', shortcut: 'Ctrl+T' },
  { view: 'config' as View, label: 'Config', shortcut: 'Ctrl+C' },
  { view: 'inspect' as View, label: 'Inspect', shortcut: 'Ctrl+I' },
] as const;

const HeaderComponent: React.FC<HeaderProps> = ({ activeView }) => {

  return (
    <Box
      flexDirection="column"
      marginBottom={1}
      borderStyle="single"
      borderColor="blue"
      paddingX={1}
    >
      <Box justifyContent="space-between">
        <Text bold color="blue">
          🔐 OAuth CLI v1.0.0
        </Text>
        <Text dimColor>Terminal User Interface</Text>
      </Box>

      <Box marginTop={1} gap={2}>
        {TABS_CONFIG.map((tab) => {
          const isActive = activeView === tab.view;
          return (
            <Box key={tab.view}>
              <Text
                color={isActive ? 'green' : 'gray'}
                bold={isActive}
              >
                [{tab.shortcut}] {tab.label}
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

// Memoize Header component to prevent unnecessary re-renders
// Only re-renders when activeView changes
export const Header = React.memo<HeaderProps>(HeaderComponent, (prevProps, nextProps) => {
  return prevProps.activeView === nextProps.activeView;
});