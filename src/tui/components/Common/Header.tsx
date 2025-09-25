import React from 'react';
import { Box, Text } from 'ink';
import type { View } from '../../App.js';

interface HeaderProps {
  activeView: View;
}

export const Header: React.FC<HeaderProps> = ({ activeView }) => {
  const tabs = [
    { view: 'dashboard' as View, label: 'Dashboard', shortcut: 'Ctrl+D' },
    { view: 'auth' as View, label: 'Auth', shortcut: 'Ctrl+A' },
    { view: 'tokens' as View, label: 'Tokens', shortcut: 'Ctrl+T' },
    { view: 'config' as View, label: 'Config', shortcut: 'Ctrl+C' },
    { view: 'inspect' as View, label: 'Inspect', shortcut: 'Ctrl+I' },
  ];

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
        {tabs.map((tab) => (
          <Box key={tab.view}>
            <Text
              color={activeView === tab.view ? 'green' : 'gray'}
              bold={activeView === tab.view}
            >
              [{tab.shortcut}] {tab.label}
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
};