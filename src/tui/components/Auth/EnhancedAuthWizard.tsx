import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import { FlowSelector, OAuthFlow } from './FlowSelector.js';
import { AuthorizationCodeFlow } from './flows/AuthorizationCodeFlow.js';
import { ClientCredentialsFlow } from './flows/ClientCredentialsFlow.js';
import { DeviceCodeFlow } from './flows/DeviceCodeFlow.js';
import { ProviderConfigManager } from '../../../providers/ProviderConfig.js';
import { useNotification } from '../../hooks/useNotification.js';
import { useKeyboard } from '../../hooks/useKeyboard.js';

interface EnhancedAuthWizardProps {
  onComplete: () => void;
  onCancel?: () => void;
}

type WizardStep =
  | 'select-provider'
  | 'select-flow'
  | 'configure-flow'
  | 'authenticating'
  | 'complete'
  | 'error';

interface AuthState {
  provider?: string;
  flow?: OAuthFlow;
  clientId?: string;
  clientSecret?: string;
  scope?: string;
  redirectUri?: string;
  username?: string;
  password?: string;
}

export const EnhancedAuthWizard: React.FC<EnhancedAuthWizardProps> = ({
  onComplete,
  onCancel
}) => {
  const [step, setStep] = useState<WizardStep>('select-provider');
  const [authState, setAuthState] = useState<AuthState>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<string[]>([]);
  const [supportedFlows, setSupportedFlows] = useState<OAuthFlow[]>([]);

  const { showNotification } = useNotification();
  const providerManager = new ProviderConfigManager();

  useEffect(() => {
    const availableProviders = providerManager.listProviderIds();
    setProviders(availableProviders);

    if (availableProviders.length === 0) {
      setError('No providers configured. Please configure a provider first.');
      setStep('error');
    }
  }, []);

  useEffect(() => {
    if (authState.provider) {
      // Determine supported flows based on provider
      // For now, we'll support all flows, but this can be customized per provider
      setSupportedFlows([
        'authorization_code',
        'client_credentials',
        'device_code',
        'password',
        'refresh_token',
      ]);
    }
  }, [authState.provider]);

  const handleProviderSelect = (item: { value: string }) => {
    setAuthState({ ...authState, provider: item.value });
    setStep('select-flow');
  };

  const handleFlowSelect = (flow: OAuthFlow) => {
    setAuthState({ ...authState, flow });
    setStep('configure-flow');
  };

  const handleAuthenticate = async () => {
    setLoading(true);
    setStep('authenticating');

    try {
      // Authentication logic will be implemented per flow
      showNotification(`Authenticating with ${authState.provider} using ${authState.flow}`, 'info');

      // Simulate authentication delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      showNotification('Authentication successful!', 'success');
      setStep('complete');
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
      setStep('error');
      showNotification('Authentication failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    switch (step) {
      case 'select-flow':
        setStep('select-provider');
        break;
      case 'configure-flow':
        setStep('select-flow');
        break;
      case 'error':
        setStep('select-provider');
        setError(null);
        break;
      default:
        if (onCancel) {
          onCancel();
        }
    }
  };

  useKeyboard({
    shortcuts: {
      escape: handleBack,
    },
    enabled: step !== 'authenticating',
  });

  // Step 1: Select Provider
  if (step === 'select-provider') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            🏢 Select OAuth Provider
          </Text>
        </Box>

        {providers.length > 0 ? (
          <>
            <Box marginBottom={1}>
              <Text dimColor>
                Choose a provider to authenticate with:
              </Text>
            </Box>
            <SelectInput
              items={providers.map((p) => ({
                label: p.charAt(0).toUpperCase() + p.slice(1),
                value: p
              }))}
              onSelect={handleProviderSelect}
            />
          </>
        ) : (
          <Box flexDirection="column" gap={1}>
            <Text color="yellow">
              ⚠️ No providers configured
            </Text>
            <Text dimColor>
              Press Ctrl+C to go to configuration and add a provider.
            </Text>
          </Box>
        )}

        <Box marginTop={2}>
          <Text dimColor>[ESC] Cancel</Text>
        </Box>
      </Box>
    );
  }

  // Step 2: Select Flow
  if (step === 'select-flow') {
    return (
      <FlowSelector
        supportedFlows={supportedFlows}
        onSelect={handleFlowSelect}
        onCancel={handleBack}
      />
    );
  }

  // Step 3: Configure Flow
  if (step === 'configure-flow') {
    const flowProps = {
      provider: authState.provider!,
      onSubmit: (config: any) => {
        setAuthState({ ...authState, ...config });
        handleAuthenticate();
      },
      onCancel: handleBack,
    };

    switch (authState.flow) {
      case 'authorization_code':
        return <AuthorizationCodeFlow {...flowProps} />;
      case 'client_credentials':
        return <ClientCredentialsFlow {...flowProps} />;
      case 'device_code':
        return <DeviceCodeFlow {...flowProps} />;
      default:
        return (
          <Box flexDirection="column" paddingY={1}>
            <Text color="yellow">
              Flow "{authState.flow}" configuration coming soon!
            </Text>
            <Box marginTop={2}>
              <Text dimColor>[ESC] Back</Text>
            </Box>
          </Box>
        );
    }
  }

  // Step 4: Authenticating
  if (step === 'authenticating' && loading) {
    return (
      <Box flexDirection="column" paddingY={1} gap={1}>
        <Box>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Text> Authenticating with {authState.provider}...</Text>
        </Box>
        <Text dimColor>Using {authState.flow?.replace('_', ' ')} flow</Text>
      </Box>
    );
  }

  // Step 5: Complete
  if (step === 'complete') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color="green" bold>
          ✅ Authentication Successful!
        </Text>
        <Box marginTop={1}>
          <Text dimColor>
            Token saved for {authState.provider}
          </Text>
        </Box>
      </Box>
    );
  }

  // Error State
  if (step === 'error' && error) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color="red" bold>
          ❌ Authentication Failed
        </Text>
        <Box marginTop={1}>
          <Text color="red">{error}</Text>
        </Box>
        <Box marginTop={2}>
          <Text dimColor>[Enter] Try Again • [ESC] Cancel</Text>
        </Box>
      </Box>
    );
  }

  return null;
};