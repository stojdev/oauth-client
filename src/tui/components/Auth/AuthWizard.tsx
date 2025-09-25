import React, { useState } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import { ProviderConfigManager } from '../../../providers/ProviderConfig.js';

interface AuthWizardProps {
  onComplete: () => void;
}

type Step = 'select-provider' | 'enter-credentials' | 'authenticating' | 'complete';

export const AuthWizard: React.FC<AuthWizardProps> = ({ onComplete: _onComplete }) => {
  const [step, setStep] = useState<Step>('select-provider');
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [_loading, _setLoading] = useState(false);
  const [error, _setError] = useState<string | null>(null);

  const providerManager = new ProviderConfigManager();
  const providers = providerManager.listProviderIds();

  const handleProviderSelect = (item: { value: string }) => {
    setSelectedProvider(item.value);
    // Presets don't contain credentials, user will need to enter them
    setClientId('');
    setClientSecret('');
    setStep('enter-credentials');
  };

  // Authentication will be implemented when user presses Enter
  // For now, this is a placeholder component

  if (step === 'select-provider') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="cyan">
          🔐 OAuth Authentication Wizard
        </Text>
        <Box marginTop={2}>
          <Text>Select a provider to authenticate:</Text>
        </Box>
        <Box marginTop={1}>
          {providers.length > 0 ? (
            <SelectInput
              items={providers.map((p) => ({ label: p, value: p }))}
              onSelect={handleProviderSelect}
            />
          ) : (
            <Text color="yellow">
              No providers configured. Press Ctrl+C to configure providers first.
            </Text>
          )}
        </Box>
      </Box>
    );
  }

  if (step === 'enter-credentials') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text bold color="cyan">
          📝 Enter Credentials for {selectedProvider}
        </Text>

        <Box marginTop={2} flexDirection="column" gap={1}>
          <Box>
            <Text>Client ID: </Text>
            <TextInput
              value={clientId}
              onChange={setClientId}
              placeholder="Enter client ID..."
            />
          </Box>

          <Box>
            <Text>Client Secret: </Text>
            <TextInput
              value={clientSecret}
              onChange={setClientSecret}
              placeholder="Enter client secret..."
              mask="*"
            />
          </Box>
        </Box>

        <Box marginTop={2} gap={2}>
          <Text color="green">[Enter] Authenticate</Text>
          <Text color="gray">[ESC] Cancel</Text>
        </Box>
      </Box>
    );
  }


  if (error) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color="red" bold>
          ❌ Authentication Failed
        </Text>
        <Box marginTop={1}>
          <Text color="red">{error}</Text>
        </Box>
        <Box marginTop={2}>
          <Text dimColor>[Enter] Try Again [ESC] Cancel</Text>
        </Box>
      </Box>
    );
  }

  return null;
};