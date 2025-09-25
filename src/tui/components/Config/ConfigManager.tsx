import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import { ProviderConfigManager } from '../../../providers/ProviderConfig.js';

type Mode = 'list' | 'add' | 'edit' | 'delete';

interface EditingProvider {
  id: string;
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
  authUrl?: string;
  scope?: string;
}

export const ConfigManager: React.FC = () => {
  const [mode, setMode] = useState<Mode>('list');
  const [providers, setProviders] = useState<string[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [editingProvider, setEditingProvider] = useState<EditingProvider | null>(null);
  const [currentField, _setCurrentField] = useState<keyof EditingProvider>('id');

  const providerManager = new ProviderConfigManager();

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = () => {
    const providerIds = providerManager.listProviderIds();
    setProviders(providerIds);
  };

  const handleProviderSelect = (item: { value: string }) => {
    if (item.value === 'add') {
      setMode('add');
      setEditingProvider({
        id: '',
        clientId: '',
        clientSecret: '',
        tokenUrl: '',
        authUrl: '',
        scope: '',
      });
    } else if (item.value === 'back') {
      setMode('list');
    } else {
      setSelectedProvider(item.value);
      const config = providerManager.getPreset(item.value);
      if (config) {
        setEditingProvider({
          id: item.value,
          clientId: '',  // Presets don't contain credentials
          clientSecret: '',  // Presets don't contain credentials
          tokenUrl: config.tokenUrl,
          authUrl: config.authorizationUrl || '',
          scope: Array.isArray(config.scope) ? config.scope.join(' ') : config.scope || '',
        });
        setMode('edit');
      }
    }
  };

  const handleFieldEdit = (value: string) => {
    if (editingProvider && currentField) {
      setEditingProvider({
        ...editingProvider,
        [currentField]: value,
      });
    }
  };

  if (mode === 'list') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="magenta">
          ⚙️  Provider Configuration
        </Text>

        <Box marginTop={2}>
          <Text>Select an action:</Text>
        </Box>

        <Box marginTop={1}>
          <SelectInput
            items={[
              { label: '➕ Add New Provider', value: 'add' },
              ...providers.map((p) => ({ label: `📝 Edit ${p}`, value: p })),
              ...(providers.length > 0 ? [{ label: '← Back', value: 'back' }] : []),
            ]}
            onSelect={handleProviderSelect}
          />
        </Box>

        {providers.length === 0 && (
          <Box marginTop={2}>
            <Text dimColor>No providers configured yet.</Text>
          </Box>
        )}
      </Box>
    );
  }

  if (mode === 'add' || mode === 'edit') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="magenta">
          {mode === 'add' ? '➕ Add New Provider' : `📝 Edit ${selectedProvider}`}
        </Text>

        <Box marginTop={2} flexDirection="column" gap={1}>
          {mode === 'add' && (
            <Box>
              <Text color={currentField === 'id' ? 'green' : 'gray'}>Provider ID: </Text>
              {currentField === 'id' ? (
                <TextInput
                  value={editingProvider?.id || ''}
                  onChange={handleFieldEdit}
                  placeholder="e.g., github, google"
                />
              ) : (
                <Text>{editingProvider?.id || ''}</Text>
              )}
            </Box>
          )}

          <Box>
            <Text color={currentField === 'clientId' ? 'green' : 'gray'}>Client ID: </Text>
            {currentField === 'clientId' ? (
              <TextInput
                value={editingProvider?.clientId || ''}
                onChange={handleFieldEdit}
                placeholder="Your OAuth client ID"
              />
            ) : (
              <Text>{editingProvider?.clientId || ''}</Text>
            )}
          </Box>

          <Box>
            <Text color={currentField === 'clientSecret' ? 'green' : 'gray'}>Client Secret: </Text>
            {currentField === 'clientSecret' ? (
              <TextInput
                value={editingProvider?.clientSecret || ''}
                onChange={handleFieldEdit}
                placeholder="Your OAuth client secret"
                mask="*"
              />
            ) : (
              <Text>{editingProvider?.clientSecret ? '********' : ''}</Text>
            )}
          </Box>

          <Box>
            <Text color={currentField === 'tokenUrl' ? 'green' : 'gray'}>Token URL: </Text>
            {currentField === 'tokenUrl' ? (
              <TextInput
                value={editingProvider?.tokenUrl || ''}
                onChange={handleFieldEdit}
                placeholder="OAuth token endpoint"
              />
            ) : (
              <Text>{editingProvider?.tokenUrl || ''}</Text>
            )}
          </Box>

          <Box>
            <Text color={currentField === 'authUrl' ? 'green' : 'gray'}>Auth URL (optional): </Text>
            {currentField === 'authUrl' ? (
              <TextInput
                value={editingProvider?.authUrl || ''}
                onChange={handleFieldEdit}
                placeholder="OAuth authorization endpoint"
              />
            ) : (
              <Text>{editingProvider?.authUrl || ''}</Text>
            )}
          </Box>

          <Box>
            <Text color={currentField === 'scope' ? 'green' : 'gray'}>Scope (optional): </Text>
            {currentField === 'scope' ? (
              <TextInput
                value={editingProvider?.scope || ''}
                onChange={handleFieldEdit}
                placeholder="Space-separated scopes"
              />
            ) : (
              <Text>{editingProvider?.scope || ''}</Text>
            )}
          </Box>
        </Box>

        <Box marginTop={2} gap={2}>
          <Text color="green">[Tab] Next Field</Text>
          <Text color="blue">[Ctrl+S] Save</Text>
          <Text color="gray">[ESC] Cancel</Text>
        </Box>
      </Box>
    );
  }

  if (mode === 'delete') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="red">
          ⚠️  Delete Provider: {selectedProvider}
        </Text>

        <Box marginTop={2}>
          <Text>Are you sure you want to delete this provider?</Text>
          <Text color="yellow">This action cannot be undone.</Text>
        </Box>

        <Box marginTop={2} gap={2}>
          <Text color="red">[Y] Yes, Delete</Text>
          <Text color="gray">[N] Cancel</Text>
        </Box>
      </Box>
    );
  }

  return null;
};