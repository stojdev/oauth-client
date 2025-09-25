import React from 'react';
import { Box, Text, useInput } from 'ink';
import Gradient from 'ink-gradient';

interface HelpModalProps {
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  useInput((input, key) => {
    if (key.escape || input === 'q' || input === 'h') {
      onClose();
    }
  });

  const shortcuts = [
    { category: 'Navigation', items: [
      { key: '↑/↓', description: 'Navigate menu items' },
      { key: 'Enter', description: 'Select menu item' },
      { key: 'ESC', description: 'Go back / Exit help' },
      { key: 'Tab', description: 'Next field' },
      { key: 'Shift+Tab', description: 'Previous field' },
    ]},
    { category: 'Quick Actions', items: [
      { key: 'd', description: 'Dashboard' },
      { key: 'a', description: 'Authentication' },
      { key: 't', description: 'View Tokens' },
      { key: 'c', description: 'Configuration' },
      { key: 'i', description: 'Inspect Token' },
      { key: 'h/?', description: 'Help' },
      { key: 'q', description: 'Quit' },
    ]},
    { category: 'Global Shortcuts', items: [
      { key: 'Ctrl+D', description: 'Jump to Dashboard' },
      { key: 'Ctrl+A', description: 'Jump to Auth' },
      { key: 'Ctrl+T', description: 'Jump to Tokens' },
      { key: 'Ctrl+C', description: 'Jump to Config' },
      { key: 'Ctrl+L', description: 'Clear screen' },
      { key: 'Ctrl+R', description: 'Refresh view' },
    ]},
    { category: 'Token Management', items: [
      { key: 'Space', description: 'Select/Deselect token' },
      { key: 'Delete', description: 'Delete selected tokens' },
      { key: 'r', description: 'Refresh token' },
      { key: 'v', description: 'View token details' },
      { key: 'c', description: 'Copy token to clipboard' },
    ]},
  ];

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="cyan"
      paddingX={2}
      paddingY={1}
      width="80%"
    >
      <Box marginBottom={1} justifyContent="center">
        <Gradient name="rainbow">
          <Text bold>OAuth CLI Help</Text>
        </Gradient>
      </Box>

      <Box marginBottom={1} justifyContent="center">
        <Text dimColor>Press ESC, h, or q to close</Text>
      </Box>

      <Box flexDirection="column">
        {shortcuts.map((section, sectionIndex) => (
          <Box key={section.category} flexDirection="column" marginBottom={sectionIndex < shortcuts.length - 1 ? 1 : 0}>
            <Box marginBottom={1}>
              <Text color="yellow" bold underline>{section.category}</Text>
            </Box>
            {section.items.map(item => (
              <Box key={item.key} flexDirection="row" marginLeft={2}>
                <Box width={15}>
                  <Text color="cyan">{item.key}</Text>
                </Box>
                <Text>{item.description}</Text>
              </Box>
            ))}
          </Box>
        ))}
      </Box>

      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text dimColor>
          OAuth CLI v1.0.0 • For more information, visit the documentation
        </Text>
      </Box>
    </Box>
  );
};