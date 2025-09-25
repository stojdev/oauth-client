import React from 'react';
import { Box, Text } from 'ink';

interface StatusBarProps {
  activeView: string;
  shortcuts?: Array<{ key: string; label: string }>;
}

export const StatusBar: React.FC<StatusBarProps> = ({ activeView, shortcuts = [] }) => {
  // More compact shortcuts for the status bar
  const defaultShortcuts = [
    { key: '?', label: 'Help' },
    { key: 'ESC', label: 'Back' },
    { key: 'q', label: 'Quit' },
  ];

  const displayShortcuts = shortcuts.length > 0 ? shortcuts : defaultShortcuts;

  return (
    <Box
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
      marginTop={1}
      flexDirection="column"
    >
      <Box flexDirection="row" justifyContent="space-between">
        <Box flexDirection="row">
          <Text dimColor>Current View: </Text>
          <Text color="cyan" bold>{activeView.charAt(0).toUpperCase() + activeView.slice(1)}</Text>
        </Box>
        <Box flexDirection="row" gap={1}>
          {displayShortcuts.map((shortcut, index) => (
            <React.Fragment key={`${shortcut.key}-${index}`}>
              {index > 0 && <Text dimColor> • </Text>}
              <Text color="yellow">{shortcut.key}</Text>
              <Text dimColor>:{shortcut.label}</Text>
            </React.Fragment>
          ))}
        </Box>
      </Box>
    </Box>
  );
};