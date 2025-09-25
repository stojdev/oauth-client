import React, { useState } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import { useKeyboard } from '../../hooks/useKeyboard.js';
import type { ProviderConfig } from '../../../types/index.js';

interface ConfigListProps {
  providers: ProviderConfig[];
  onSelect: (provider: ProviderConfig) => void;
  onNew: () => void;
  onTest: (provider: ProviderConfig) => void;
  onDelete: (providerName: string) => void;
  onImport: () => void;
  onExport: () => void;
}

export const ConfigList: React.FC<ConfigListProps> = ({
  providers,
  onSelect,
  onNew,
  onTest,
  onDelete,
  onImport,
  onExport
}) => {
  const [selectedIndex] = useState(0);
  const [showActions, setShowActions] = useState(false);

  useKeyboard({
    shortcuts: {
      enter: () => {
        if (!showActions && providers[selectedIndex]) {
          onSelect(providers[selectedIndex]);
        }
      },
      t: () => {
        if (providers[selectedIndex]) {
          onTest(providers[selectedIndex]);
        }
      },
      d: () => {
        if (providers[selectedIndex]) {
          onDelete(providers[selectedIndex].name);
        }
      },
      a: () => setShowActions(!showActions)
    },
    enabled: !showActions
  });

  const renderProviderItem = (provider: ProviderConfig, index: number) => {
    const isSelected = index === selectedIndex;

    return (
      <Box key={provider.name} marginBottom={1}>
        <Box width="100%">
          <Text color={isSelected ? 'cyan' : undefined} bold={isSelected}>
            {isSelected ? '▶ ' : '  '}
            {provider.displayName || provider.name}
          </Text>
          <Box marginLeft={4}>
            <Text dimColor>
              {provider.authorizationUrl ? '✓ Auth' : '✗ Auth'} |
              {provider.tokenUrl ? ' ✓ Token' : ' ✗ Token'} |
              {provider.clientId ? ' ✓ Client' : ' ✗ Client'}
            </Text>
          </Box>
        </Box>
      </Box>
    );
  };

  if (providers.length === 0) {
    return (
      <Box flexDirection="column" paddingY={1} paddingX={2}>
        <Text bold color="yellow">📂 No Providers Configured</Text>
        <Box marginTop={1}>
          <Text>Get started by adding a provider configuration.</Text>
        </Box>

        <Box marginTop={2}>
          <SelectInput
            items={[
              { label: '➕ Add New Provider', value: 'new' },
              { label: '📥 Import Configuration', value: 'import' }
            ]}
            onSelect={(item) => {
              if (item.value === 'new') {
                onNew();
              } else if (item.value === 'import') {
                onImport();
              }
            }}
          />
        </Box>
      </Box>
    );
  }

  if (showActions) {
    return (
      <Box flexDirection="column" paddingY={1} paddingX={2}>
        <Box marginBottom={1}>
          <Text bold>Select Action:</Text>
        </Box>
        <SelectInput
          items={[
            { label: '✏️ Edit Provider', value: 'edit' },
            { label: '🧪 Test Configuration', value: 'test' },
            { label: '🗑️ Delete Provider', value: 'delete' },
            { label: '➕ Add New Provider', value: 'new' },
            { label: '📥 Import Configuration', value: 'import' },
            { label: '📤 Export Configuration', value: 'export' },
            { label: '❌ Cancel', value: 'cancel' }
          ]}
          onSelect={(item) => {
            const provider = providers[selectedIndex];
            switch (item.value) {
              case 'edit':
                if (provider) onSelect(provider);
                break;
              case 'test':
                if (provider) onTest(provider);
                break;
              case 'delete':
                if (provider) onDelete(provider.name);
                break;
              case 'new':
                onNew();
                break;
              case 'import':
                onImport();
                break;
              case 'export':
                onExport();
                break;
            }
            setShowActions(false);
          }}
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingY={1} paddingX={2}>
      <Box marginBottom={1}>
        <Text bold underline>
          Provider Configurations ({providers.length})
        </Text>
      </Box>

      <Box flexDirection="column">
        {providers.map((provider, index) => renderProviderItem(provider, index))}
      </Box>

      <Box marginTop={2} flexDirection="column" gap={1}>
        <Text bold color="yellow">Quick Actions:</Text>
        <Box gap={2}>
          <Text dimColor>[↑↓] Navigate</Text>
          <Text dimColor>[Enter] Edit</Text>
          <Text dimColor>[T] Test</Text>
          <Text dimColor>[D] Delete</Text>
          <Text dimColor>[A] All Actions</Text>
        </Box>
      </Box>
    </Box>
  );
};