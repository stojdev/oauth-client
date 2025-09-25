import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { useKeyboard } from '../../hooks/useKeyboard.js';
import { useNotification } from '../../hooks/useNotification.js';

interface ProviderDiscoveryProps {
  onComplete: (config: any) => void;
  onCancel: () => void;
}

type DiscoveryStep = 'input' | 'discovering' | 'review' | 'configure';

interface DiscoveredConfig {
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userinfoEndpoint?: string;
  jwksUri?: string;
  registrationEndpoint?: string;
  scopesSupported?: string[];
  responseTypesSupported?: string[];
  grantTypesSupported?: string[];
}

export const ProviderDiscovery: React.FC<ProviderDiscoveryProps> = ({
  onComplete,
  onCancel
}) => {
  const [step, setStep] = useState<DiscoveryStep>('input');
  const [issuerUrl, setIssuerUrl] = useState('');
  const [discovering, setDiscovering] = useState(false);
  const [discoveredConfig, setDiscoveredConfig] = useState<DiscoveredConfig | null>(null);
  const [providerName, setProviderName] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [activeField, setActiveField] = useState<'name' | 'clientId' | 'clientSecret'>('name');

  const { showNotification } = useNotification();

  const handleDiscover = async () => {
    if (!issuerUrl) return;

    setStep('discovering');
    setDiscovering(true);

    try {
      // Simulate OIDC discovery
      // In real implementation, this would fetch /.well-known/openid-configuration
      await new Promise(resolve => setTimeout(resolve, 2000));

      const mockConfig: DiscoveredConfig = {
        issuer: issuerUrl,
        authorizationEndpoint: `${issuerUrl}/authorize`,
        tokenEndpoint: `${issuerUrl}/token`,
        userinfoEndpoint: `${issuerUrl}/userinfo`,
        jwksUri: `${issuerUrl}/jwks`,
        scopesSupported: ['openid', 'profile', 'email'],
        responseTypesSupported: ['code', 'token', 'id_token'],
        grantTypesSupported: ['authorization_code', 'refresh_token'],
      };

      setDiscoveredConfig(mockConfig);
      setStep('review');
      showNotification('OIDC configuration discovered successfully', 'success');
    } catch (error) {
      showNotification('Failed to discover OIDC configuration', 'error');
      setStep('input');
    } finally {
      setDiscovering(false);
    }
  };

  const handleAcceptConfig = () => {
    const providerNameFromUrl = issuerUrl
      .replace(/^https?:\/\//, '')
      .split('.')[0]
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());

    setProviderName(providerNameFromUrl);
    setStep('configure');
  };

  const handleSaveProvider = () => {
    if (!providerName || !clientId || !discoveredConfig) return;

    const config = {
      id: providerName.toLowerCase().replace(/\s+/g, '-'),
      name: providerName,
      type: 'oidc',
      issuer: discoveredConfig.issuer,
      authorizationEndpoint: discoveredConfig.authorizationEndpoint,
      tokenEndpoint: discoveredConfig.tokenEndpoint,
      userinfoEndpoint: discoveredConfig.userinfoEndpoint,
      jwksUri: discoveredConfig.jwksUri,
      clientId,
      clientSecret,
      scopesSupported: discoveredConfig.scopesSupported,
    };

    onComplete(config);
    showNotification(`Provider ${providerName} configured successfully`, 'success');
  };

  useKeyboard({
    shortcuts: {
      enter: () => {
        if (step === 'input') {
          handleDiscover();
        } else if (step === 'review') {
          handleAcceptConfig();
        } else if (step === 'configure') {
          handleSaveProvider();
        }
      },
      escape: () => {
        if (step === 'configure') {
          setStep('review');
        } else if (step === 'review') {
          setStep('input');
        } else {
          onCancel();
        }
      },
      tab: () => {
        if (step === 'configure') {
          const fields: ('name' | 'clientId' | 'clientSecret')[] = ['name', 'clientId', 'clientSecret'];
          const currentIndex = fields.indexOf(activeField);
          const nextIndex = (currentIndex + 1) % fields.length;
          setActiveField(fields[nextIndex]);
        }
      },
    },
    enabled: !discovering,
  });

  // Step 1: Input Issuer URL
  if (step === 'input') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            🔍 OIDC Provider Discovery
          </Text>
        </Box>

        <Box flexDirection="column" gap={1}>
          <Text>Enter the issuer URL to discover OIDC configuration:</Text>
          <Box>
            <Text>Issuer URL: </Text>
            <TextInput
              value={issuerUrl}
              onChange={setIssuerUrl}
              placeholder="https://accounts.example.com"
            />
          </Box>
        </Box>

        <Box marginTop={2} flexDirection="column" gap={1}>
          <Text dimColor>Common OIDC Providers:</Text>
          <Box marginLeft={2} flexDirection="column">
            <Text dimColor>• Google: https://accounts.google.com</Text>
            <Text dimColor>• Auth0: https://YOUR_DOMAIN.auth0.com</Text>
            <Text dimColor>• Okta: https://YOUR_DOMAIN.okta.com</Text>
            <Text dimColor>• Keycloak: https://YOUR_DOMAIN/realms/YOUR_REALM</Text>
          </Box>
        </Box>

        <Box marginTop={2} gap={2}>
          <Text color={issuerUrl ? 'green' : 'gray'}>[Enter] Discover</Text>
          <Text dimColor>[ESC] Cancel</Text>
        </Box>
      </Box>
    );
  }

  // Step 2: Discovering
  if (step === 'discovering' && discovering) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Text> Discovering OIDC configuration...</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Fetching: {issuerUrl}/.well-known/openid-configuration</Text>
        </Box>
      </Box>
    );
  }

  // Step 3: Review Configuration
  if (step === 'review' && discoveredConfig) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            ✅ OIDC Configuration Discovered
          </Text>
        </Box>

        <Box flexDirection="column" gap={1}>
          <Box>
            <Text color="gray">Issuer: </Text>
            <Text>{discoveredConfig.issuer}</Text>
          </Box>

          <Box>
            <Text color="gray">Authorization: </Text>
            <Text wrap="truncate-end">{discoveredConfig.authorizationEndpoint}</Text>
          </Box>

          <Box>
            <Text color="gray">Token: </Text>
            <Text wrap="truncate-end">{discoveredConfig.tokenEndpoint}</Text>
          </Box>

          {discoveredConfig.userinfoEndpoint && (
            <Box>
              <Text color="gray">UserInfo: </Text>
              <Text wrap="truncate-end">{discoveredConfig.userinfoEndpoint}</Text>
            </Box>
          )}

          {discoveredConfig.scopesSupported && (
            <Box>
              <Text color="gray">Scopes: </Text>
              <Text color="green">{discoveredConfig.scopesSupported.join(', ')}</Text>
            </Box>
          )}

          {discoveredConfig.grantTypesSupported && (
            <Box>
              <Text color="gray">Grant Types: </Text>
              <Text>{discoveredConfig.grantTypesSupported.join(', ')}</Text>
            </Box>
          )}
        </Box>

        <Box marginTop={2} gap={2}>
          <Text color="green">[Enter] Configure Provider</Text>
          <Text dimColor>[ESC] Back</Text>
        </Box>
      </Box>
    );
  }

  // Step 4: Configure Provider
  if (step === 'configure') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            ⚙️ Configure OIDC Provider
          </Text>
        </Box>

        <Box flexDirection="column" gap={1}>
          <Box>
            <Box width={20}>
              <Text color={activeField === 'name' ? 'cyan' : undefined}>
                Provider Name:
              </Text>
            </Box>
            {activeField === 'name' ? (
              <TextInput
                value={providerName}
                onChange={setProviderName}
                placeholder="My Provider"
              />
            ) : (
              <Text>{providerName || '<provider name>'}</Text>
            )}
          </Box>

          <Box>
            <Box width={20}>
              <Text color={activeField === 'clientId' ? 'cyan' : undefined}>
                Client ID: <Text color="red">*</Text>
              </Text>
            </Box>
            {activeField === 'clientId' ? (
              <TextInput
                value={clientId}
                onChange={setClientId}
                placeholder="Enter client ID..."
              />
            ) : (
              <Text dimColor>{clientId || '<client id>'}</Text>
            )}
          </Box>

          <Box>
            <Box width={20}>
              <Text color={activeField === 'clientSecret' ? 'cyan' : undefined}>
                Client Secret:
              </Text>
            </Box>
            {activeField === 'clientSecret' ? (
              <TextInput
                value={clientSecret}
                onChange={setClientSecret}
                placeholder="Enter client secret (optional)..."
                mask="*"
              />
            ) : (
              <Text dimColor>
                {clientSecret ? '•'.repeat(clientSecret.length) : '<client secret>'}
              </Text>
            )}
          </Box>
        </Box>

        <Box marginTop={2} gap={2}>
          <Text color={providerName && clientId ? 'green' : 'gray'}>
            [Enter] Save Provider
          </Text>
          <Text dimColor>[Tab] Next Field</Text>
          <Text dimColor>[ESC] Back</Text>
        </Box>
      </Box>
    );
  }

  return null;
};