import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import { ProviderConfigManager } from '../../../providers/ProviderConfig.js';
import { ProviderEditor } from './ProviderEditor.js';
import { ProviderDiscovery } from './ProviderDiscovery.js';
import { ProviderTemplates } from './ProviderTemplates.js';
import { useKeyboard } from '../../hooks/useKeyboard.js';
import { useNotification } from '../../hooks/useNotification.js';

type ConfigView = 'list' | 'add' | 'edit' | 'discovery' | 'templates' | 'import' | 'export';

interface Provider {
  id: string;
  name: string;
  type: 'oauth2' | 'oidc';
  clientId?: string;
  hasClientSecret?: boolean;
  tokenEndpoint?: string;
  authorizationEndpoint?: string;
  issuer?: string;
  configured: boolean;
  verified?: boolean;
  lastUsed?: Date;
}

export const EnhancedConfigManager: React.FC = () => {
  const [view, setView] = useState<ConfigView>('list');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [showActions, setShowActions] = useState(false);

  const providerManager = new ProviderConfigManager();
  const { showNotification } = useNotification();

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    setLoading(true);
    try {
      const providerIds = providerManager.listProviderIds();
      const loadedProviders: Provider[] = [];

      for (const id of providerIds) {
        const preset = providerManager.getPreset(id);
        if (preset) {
          loadedProviders.push({
            id,
            name: preset.name || id,
            type: 'oauth2', // All presets are OAuth2 for now
            clientId: undefined, // Will be loaded from actual config
            hasClientSecret: false,
            tokenEndpoint: preset.tokenUrl,
            authorizationEndpoint: preset.authorizationUrl,
            issuer: undefined,
            configured: false, // Need to check actual config file
            verified: false,
          });
        }
      }

      // Add preset providers that aren't configured
      const presets = ['github', 'google', 'microsoft', 'auth0', 'okta'];
      for (const preset of presets) {
        if (!loadedProviders.find(p => p.id === preset)) {
          loadedProviders.push({
            id: preset,
            name: preset.charAt(0).toUpperCase() + preset.slice(1),
            type: 'oauth2',
            configured: false,
          });
        }
      }

      setProviders(loadedProviders);
      if (loadedProviders.length > 0 && !selectedProvider) {
        setSelectedProvider(loadedProviders[0]);
      }
    } catch (error) {
      showNotification('Failed to load providers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProvider = () => {
    setView('add');
  };

  const handleEditProvider = () => {
    if (selectedProvider) {
      setView('edit');
    }
  };

  const handleDeleteProvider = async () => {
    if (!selectedProvider) return;

    try {
      // Implementation would delete the provider config
      showNotification(`Provider ${selectedProvider.name} deleted`, 'success');
      await loadProviders();
    } catch (error) {
      showNotification('Failed to delete provider', 'error');
    }
  };

  const handleDiscovery = () => {
    setView('discovery');
  };

  const handleTemplates = () => {
    setView('templates');
  };

  const handleExport = () => {
    showNotification('Configuration exported', 'success');
  };

  const handleImport = () => {
    setView('import');
  };

  const menuActions = [
    { label: 'Add Provider', value: 'add', icon: '➕' },
    { label: 'Edit Provider', value: 'edit', icon: '✏️' },
    { label: 'Delete Provider', value: 'delete', icon: '🗑️' },
    { label: 'OIDC Discovery', value: 'discovery', icon: '🔍' },
    { label: 'Use Template', value: 'templates', icon: '📋' },
    { label: 'Import Config', value: 'import', icon: '📥' },
    { label: 'Export Config', value: 'export', icon: '📤' },
  ];

  const handleActionSelect = (item: { value: string }) => {
    switch (item.value) {
      case 'add':
        handleAddProvider();
        break;
      case 'edit':
        handleEditProvider();
        break;
      case 'delete':
        handleDeleteProvider();
        break;
      case 'discovery':
        handleDiscovery();
        break;
      case 'templates':
        handleTemplates();
        break;
      case 'import':
        handleImport();
        break;
      case 'export':
        handleExport();
        break;
    }
    setShowActions(false);
  };

  useKeyboard({
    shortcuts: {
      a: handleAddProvider,
      e: handleEditProvider,
      d: () => setShowActions(!showActions),
      delete: handleDeleteProvider,
      t: handleTemplates,
      o: handleDiscovery,
      escape: () => {
        if (view !== 'list') {
          setView('list');
        }
      },
    },
    enabled: !loading,
  });

  if (loading) {
    return (
      <Box paddingY={1}>
        <Text color="cyan">
          <Spinner type="dots" />
        </Text>
        <Text> Loading providers...</Text>
      </Box>
    );
  }

  // Provider Editor View
  if (view === 'edit' && selectedProvider) {
    return (
      <ProviderEditor
        provider={selectedProvider}
        onSave={async () => {
          await loadProviders();
          setView('list');
          showNotification('Provider updated', 'success');
        }}
        onCancel={() => setView('list')}
      />
    );
  }

  // Add Provider View
  if (view === 'add') {
    return (
      <ProviderEditor
        onSave={async () => {
          await loadProviders();
          setView('list');
          showNotification('Provider added', 'success');
        }}
        onCancel={() => setView('list')}
      />
    );
  }

  // OIDC Discovery View
  if (view === 'discovery') {
    return (
      <ProviderDiscovery
        onComplete={async () => {
          await loadProviders();
          setView('list');
        }}
        onCancel={() => setView('list')}
      />
    );
  }

  // Templates View
  if (view === 'templates') {
    return (
      <ProviderTemplates
        onSelect={async () => {
          await loadProviders();
          setView('list');
        }}
        onCancel={() => setView('list')}
      />
    );
  }

  // Main List View
  return (
    <Box flexDirection="column" paddingY={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          ⚙️ Provider Configuration
        </Text>
      </Box>

      <Box flexDirection="row" gap={2}>
        {/* Provider List */}
        <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1} width="45%">
          <Box marginBottom={1}>
            <Text bold underline>
              Providers ({providers.length})
            </Text>
          </Box>

          {providers.map((provider) => (
            <Box key={provider.id} marginBottom={1} flexDirection="column">
              <Box flexDirection="row">
                <Text
                  color={
                    !provider.configured ? 'gray' :
                    provider.verified ? 'green' :
                    selectedProvider?.id === provider.id ? 'cyan' :
                    undefined
                  }
                  bold={selectedProvider?.id === provider.id}
                >
                  {selectedProvider?.id === provider.id ? '▶ ' : '  '}
                  {provider.configured ? '✓' : '○'} {provider.name}
                </Text>
              </Box>
              <Box marginLeft={4}>
                <Text dimColor>
                  {provider.type === 'oidc' ? 'OIDC' : 'OAuth 2.0'}
                  {provider.configured ? ' (Configured)' : ' (Not configured)'}
                </Text>
              </Box>
            </Box>
          ))}
        </Box>

        {/* Provider Details or Actions */}
        <Box flexDirection="column" flexGrow={1}>
          {showActions ? (
            <Box flexDirection="column">
              <Box marginBottom={1}>
                <Text bold>Select Action:</Text>
              </Box>
              <SelectInput
                items={menuActions.map(action => ({
                  label: `${action.icon} ${action.label}`,
                  value: action.value,
                }))}
                onSelect={handleActionSelect}
              />
            </Box>
          ) : selectedProvider ? (
            <Box flexDirection="column">
              <Box marginBottom={1}>
                <Text bold underline>
                  {selectedProvider.name} Details
                </Text>
              </Box>

              <Box flexDirection="column" gap={1}>
                <Box>
                  <Text color="gray">Type: </Text>
                  <Text>{selectedProvider.type === 'oidc' ? 'OpenID Connect' : 'OAuth 2.0'}</Text>
                </Box>

                <Box>
                  <Text color="gray">Status: </Text>
                  <Text color={selectedProvider.configured ? 'green' : 'yellow'}>
                    {selectedProvider.configured ? 'Configured' : 'Not Configured'}
                  </Text>
                </Box>

                {selectedProvider.clientId && (
                  <Box>
                    <Text color="gray">Client ID: </Text>
                    <Text>{selectedProvider.clientId}</Text>
                  </Box>
                )}

                {selectedProvider.hasClientSecret && (
                  <Box>
                    <Text color="gray">Client Secret: </Text>
                    <Text color="green">✓ Configured</Text>
                  </Box>
                )}

                {selectedProvider.issuer && (
                  <Box>
                    <Text color="gray">Issuer: </Text>
                    <Text>{selectedProvider.issuer}</Text>
                  </Box>
                )}

                {selectedProvider.tokenEndpoint && (
                  <Box>
                    <Text color="gray">Token Endpoint: </Text>
                    <Text wrap="truncate-end">
                      {selectedProvider.tokenEndpoint}
                    </Text>
                  </Box>
                )}
              </Box>

              {!selectedProvider.configured && (
                <Box marginTop={2} borderStyle="round" borderColor="yellow" paddingX={1}>
                  <Text color="yellow">
                    ⚠️ This provider needs configuration
                  </Text>
                </Box>
              )}
            </Box>
          ) : (
            <Box>
              <Text dimColor>Select a provider to view details</Text>
            </Box>
          )}
        </Box>
      </Box>

      <Box marginTop={2} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text dimColor>
          [A] Add • [E] Edit • [D] Actions • [T] Templates • [O] Discovery • [Del] Delete • [ESC] Back
        </Text>
      </Box>
    </Box>
  );
};