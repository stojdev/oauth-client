import React from 'react';
import { Box, Text } from 'ink';

export const Footer: React.FC = () => {
  return (
    <Box
      marginTop={1}
      paddingX={1}
      borderStyle="single"
      borderColor="gray"
      justifyContent="space-between"
    >
      <Box gap={2}>
        <Text dimColor>[ESC] Exit</Text>
        <Text dimColor>[Tab] Navigate</Text>
        <Text dimColor>[Enter] Select</Text>
        <Text dimColor>[?] Help</Text>
      </Box>
      <Text dimColor>Ready</Text>
    </Box>
  );
};