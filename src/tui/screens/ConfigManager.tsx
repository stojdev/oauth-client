import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { ConfigList } from '../components/displays/ConfigList.js';
import { ConfigEditor } from '../components/forms/ConfigEditor.js';
import { ConfigTester } from '../components/forms/ConfigTester.js';
import { useKeyboard } from '../hooks/useKeyboard.js';
import { useNotification } from '../hooks/useNotification.js';
import type { ProviderConfig } from '../../types/index.js';

type ConfigMode = 'list' | 'edit' | 'test' | 'import' | 'export';

interface ConfigManagerProps {
  onBack: () => void;
}

export const ConfigManager: React.FC<ConfigManagerProps> = ({ onBack }) => {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [mode, setMode] = useState<ConfigMode>('list');
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [loading, setLoading] = useState(false);

  const { showNotification } = useNotification();

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    setLoading(true);
    try {
      // Load providers from configuration
      const configPath = process.env.OAUTH_CONFIG_PATH || './oauth-config.json';
      const fs = await import('fs/promises');

      try {
        const configData = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configData);
        setProviders(config.providers || []);
      } catch (error) {
        // No config file exists yet
        setProviders([]);
      }
    } catch (error) {
      showNotification('Failed to load providers', 'error');
      setProviders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (provider: ProviderConfig) => {
    try {
      const updatedProviders = selectedProvider
        ? providers.map(p => p.name === selectedProvider ? provider : p)
        : [...providers, provider];

      setProviders(updatedProviders);
      await saveProviders(updatedProviders);

      showNotification(
        selectedProvider ? 'Provider updated successfully' : 'Provider added successfully',
        'success'
      );

      setMode('list');
      setSelectedProvider(null);
    } catch (error) {
      showNotification('Failed to save provider', 'error');
    }
  };

  const handleDelete = async (providerName: string) => {
    try {
      const updatedProviders = providers.filter(p => p.name !== providerName);
      setProviders(updatedProviders);
      await saveProviders(updatedProviders);

      showNotification('Provider deleted successfully', 'success');
      setSelectedProvider(null);
    } catch (error) {
      showNotification('Failed to delete provider', 'error');
    }
  };

  const saveProviders = async (providerList: ProviderConfig[]) => {
    const configPath = process.env.OAUTH_CONFIG_PATH || './oauth-config.json';
    const fs = await import('fs/promises');

    const config = {
      providers: providerList,
      version: '1.0.0',
      lastUpdated: new Date().toISOString()
    };

    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  };

  // Import functionality - will be implemented with file dialog
  // const handleImport = async (jsonData: string) => {
  //   try {
  //     const importedConfig = JSON.parse(jsonData);
  //     const importedProviders = importedConfig.providers || importedConfig;

  //     if (!Array.isArray(importedProviders)) {
  //       throw new Error('Invalid configuration format');
  //     }

  //     // Merge with existing providers
  //     const mergedProviders = [...providers];
  //     for (const provider of importedProviders) {
  //       const existingIndex = mergedProviders.findIndex(p => p.name === provider.name);
  //       if (existingIndex >= 0) {
  //         mergedProviders[existingIndex] = provider;
  //       } else {
  //         mergedProviders.push(provider);
  //       }
  //     }

  //     setProviders(mergedProviders);
  //     await saveProviders(mergedProviders);

  //     showNotification(`Imported ${importedProviders.length} provider(s) successfully`, 'success');
  //     setMode('list');
  //   } catch (error) {
  //     showNotification('Failed to import configuration', 'error');
  //   }
  // };

  const handleExport = () => {
    const exportData = {
      providers,
      version: '1.0.0',
      exportedAt: new Date().toISOString()
    };

    return JSON.stringify(exportData, null, 2);
  };

  useKeyboard({
    shortcuts: {
      escape: () => {
        if (mode !== 'list') {
          setMode('list');
          setSelectedProvider(null);
        } else {
          onBack();
        }
      },
      n: () => {
        if (mode === 'list') {
          setSelectedProvider(null);
          setMode('edit');
        }
      },
      i: () => {
        if (mode === 'list') {
          setMode('import');
        }
      },
      e: () => {
        if (mode === 'list') {
          setMode('export');
        }
      }
    },
    enabled: true
  });

  if (loading) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color="cyan">Loading configuration...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height="100%">
      <Box marginBottom={1} borderStyle="single" borderColor="cyan" paddingX={1}>
        <Text bold color="cyan">
          ⚙️ Configuration Management
        </Text>
      </Box>

      {mode === 'list' && (
        <ConfigList
          providers={providers}
          onSelect={(provider) => {
            setSelectedProvider(provider.name);
            setMode('edit');
          }}
          onNew={() => {
            setSelectedProvider(null);
            setMode('edit');
          }}
          onTest={(provider) => {
            setSelectedProvider(provider.name);
            setMode('test');
          }}
          onDelete={handleDelete}
          onImport={() => setMode('import')}
          onExport={() => setMode('export')}
        />
      )}

      {mode === 'edit' && (
        <ConfigEditor
          provider={providers.find(p => p.name === selectedProvider)}
          onSave={handleSave}
          onCancel={() => {
            setMode('list');
            setSelectedProvider(null);
          }}
          onTest={() => setMode('test')}
        />
      )}

      {mode === 'test' && (
        <ConfigTester
          provider={providers.find(p => p.name === selectedProvider)!}
          onBack={() => setMode('edit')}
        />
      )}

      {mode === 'import' && (
        <Box flexDirection="column" paddingX={2} paddingY={1}>
          <Text bold color="green">📥 Import Configuration</Text>
          <Box marginTop={1}>
            <Text>Paste JSON configuration or provide file path</Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Press ESC to cancel</Text>
          </Box>
        </Box>
      )}

      {mode === 'export' && (
        <Box flexDirection="column" paddingX={2} paddingY={1}>
          <Text bold color="blue">📤 Export Configuration</Text>
          <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1} paddingY={1}>
            <Text>{handleExport()}</Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Configuration exported. Press ESC to go back</Text>
          </Box>
        </Box>
      )}

      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text dimColor>
          {mode === 'list' && '[N] New • [I] Import • [E] Export • [ESC] Back'}
          {mode === 'edit' && '[S] Save • [T] Test • [ESC] Cancel'}
          {mode === 'test' && '[ESC] Back to Editor'}
          {(mode === 'import' || mode === 'export') && '[ESC] Back to List'}
        </Text>
      </Box>
    </Box>
  );
};