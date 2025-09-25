import React, { useState } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import { useKeyboard } from '../../hooks/useKeyboard.js';
import { useNotification } from '../../hooks/useNotification.js';

interface ProviderTemplatesProps {
  onSelect: (config: any) => void;
  onCancel: () => void;
}

interface ProviderTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'oauth2' | 'oidc';
  config: {
    authorizationEndpoint?: string;
    tokenEndpoint?: string;
    issuer?: string;
    scopesSupported?: string[];
    requiresClientSecret: boolean;
    pkceRequired?: boolean;
    customDomain?: boolean;
  };
}

const PROVIDER_TEMPLATES: ProviderTemplate[] = [
  {
    id: 'github',
    name: 'GitHub',
    description: 'GitHub OAuth for user authentication and API access',
    icon: '🐙',
    type: 'oauth2',
    config: {
      authorizationEndpoint: 'https://github.com/login/oauth/authorize',
      tokenEndpoint: 'https://github.com/login/oauth/access_token',
      scopesSupported: ['user', 'repo', 'gist', 'notifications'],
      requiresClientSecret: true,
    },
  },
  {
    id: 'google',
    name: 'Google',
    description: 'Google Identity Platform with OpenID Connect',
    icon: '🔍',
    type: 'oidc',
    config: {
      issuer: 'https://accounts.google.com',
      scopesSupported: ['openid', 'email', 'profile'],
      requiresClientSecret: true,
    },
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    description: 'Microsoft Identity Platform (Azure AD)',
    icon: '🪟',
    type: 'oidc',
    config: {
      issuer: 'https://login.microsoftonline.com/{tenant}/v2.0',
      scopesSupported: ['openid', 'email', 'profile', 'offline_access'],
      requiresClientSecret: true,
      customDomain: true,
    },
  },
  {
    id: 'auth0',
    name: 'Auth0',
    description: 'Auth0 Universal Login with custom domains',
    icon: '🔐',
    type: 'oidc',
    config: {
      issuer: 'https://{domain}.auth0.com',
      scopesSupported: ['openid', 'email', 'profile', 'offline_access'],
      requiresClientSecret: false,
      customDomain: true,
      pkceRequired: true,
    },
  },
  {
    id: 'okta',
    name: 'Okta',
    description: 'Okta Identity Cloud for enterprise SSO',
    icon: '🏢',
    type: 'oidc',
    config: {
      issuer: 'https://{domain}.okta.com',
      scopesSupported: ['openid', 'email', 'profile', 'groups'],
      requiresClientSecret: false,
      customDomain: true,
      pkceRequired: true,
    },
  },
  {
    id: 'keycloak',
    name: 'Keycloak',
    description: 'Open source identity and access management',
    icon: '🔑',
    type: 'oidc',
    config: {
      issuer: 'https://{domain}/realms/{realm}',
      scopesSupported: ['openid', 'email', 'profile', 'roles'],
      requiresClientSecret: true,
      customDomain: true,
    },
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Discord OAuth for bot and user authentication',
    icon: '💬',
    type: 'oauth2',
    config: {
      authorizationEndpoint: 'https://discord.com/api/oauth2/authorize',
      tokenEndpoint: 'https://discord.com/api/oauth2/token',
      scopesSupported: ['identify', 'email', 'guilds', 'bot'],
      requiresClientSecret: true,
    },
  },
  {
    id: 'spotify',
    name: 'Spotify',
    description: 'Spotify Web API for music data access',
    icon: '🎵',
    type: 'oauth2',
    config: {
      authorizationEndpoint: 'https://accounts.spotify.com/authorize',
      tokenEndpoint: 'https://accounts.spotify.com/api/token',
      scopesSupported: ['user-read-private', 'user-read-email', 'playlist-read-private'],
      requiresClientSecret: true,
    },
  },
];

type ConfigStep = 'select' | 'customize' | 'credentials';

export const ProviderTemplates: React.FC<ProviderTemplatesProps> = ({
  onSelect,
  onCancel
}) => {
  const [step, setStep] = useState<ConfigStep>('select');
  const [selectedTemplate, setSelectedTemplate] = useState<ProviderTemplate | null>(null);
  const [customDomain, setCustomDomain] = useState('');
  const [tenant, setTenant] = useState('');
  const [realm, setRealm] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [activeField, setActiveField] = useState<'domain' | 'tenant' | 'realm' | 'clientId' | 'clientSecret'>('domain');

  const { showNotification } = useNotification();

  const handleTemplateSelect = (item: { value: string }) => {
    const template = PROVIDER_TEMPLATES.find(t => t.id === item.value);
    if (template) {
      setSelectedTemplate(template);
      if (template.config.customDomain) {
        setStep('customize');
      } else {
        setStep('credentials');
      }
    }
  };

  const handleContinueToCredentials = () => {
    if (selectedTemplate?.config.customDomain) {
      if ((selectedTemplate.id === 'microsoft' || selectedTemplate.id === 'keycloak') && !tenant) {
        return;
      }
      if (selectedTemplate.id === 'keycloak' && !realm) {
        return;
      }
      if (!customDomain && selectedTemplate.id !== 'microsoft' && selectedTemplate.id !== 'keycloak') {
        return;
      }
    }
    setStep('credentials');
  };

  const handleSaveProvider = () => {
    if (!selectedTemplate || !clientId) return;

    let issuer = selectedTemplate.config.issuer;
    let authEndpoint = selectedTemplate.config.authorizationEndpoint;
    let tokenEndpoint = selectedTemplate.config.tokenEndpoint;

    // Process custom domains
    if (selectedTemplate.config.customDomain) {
      if (selectedTemplate.id === 'microsoft') {
        issuer = issuer?.replace('{tenant}', tenant || 'common');
      } else if (selectedTemplate.id === 'keycloak') {
        issuer = issuer?.replace('{domain}', customDomain).replace('{realm}', realm);
      } else {
        issuer = issuer?.replace('{domain}', customDomain);
      }
    }

    const config = {
      id: selectedTemplate.id,
      name: selectedTemplate.name,
      type: selectedTemplate.type,
      issuer,
      authorizationEndpoint: authEndpoint,
      tokenEndpoint: tokenEndpoint,
      clientId,
      clientSecret: selectedTemplate.config.requiresClientSecret ? clientSecret : undefined,
      scopesSupported: selectedTemplate.config.scopesSupported,
      pkceRequired: selectedTemplate.config.pkceRequired,
    };

    onSelect(config);
    showNotification(`${selectedTemplate.name} provider configured`, 'success');
  };

  useKeyboard({
    shortcuts: {
      escape: () => {
        if (step === 'credentials') {
          setStep(selectedTemplate?.config.customDomain ? 'customize' : 'select');
        } else if (step === 'customize') {
          setStep('select');
        } else {
          onCancel();
        }
      },
      enter: () => {
        if (step === 'customize') {
          handleContinueToCredentials();
        } else if (step === 'credentials') {
          handleSaveProvider();
        }
      },
      tab: () => {
        if (step === 'credentials') {
          setActiveField(activeField === 'clientId' ? 'clientSecret' : 'clientId');
        }
      },
    },
    enabled: step !== 'select',
  });

  // Step 1: Select Template
  if (step === 'select') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            📋 Provider Templates
          </Text>
        </Box>

        <Box marginBottom={1}>
          <Text>
            Select a provider template to get started quickly:
          </Text>
        </Box>

        <SelectInput
          items={PROVIDER_TEMPLATES.map(template => ({
            label: `${template.icon} ${template.name} - ${template.description}`,
            value: template.id,
          }))}
          onSelect={handleTemplateSelect}
        />

        <Box marginTop={2}>
          <Text dimColor>[ESC] Cancel</Text>
        </Box>
      </Box>
    );
  }

  // Step 2: Customize Domain (if needed)
  if (step === 'customize' && selectedTemplate?.config.customDomain) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            ⚙️ Configure {selectedTemplate.name}
          </Text>
        </Box>

        <Box flexDirection="column" gap={1}>
          {selectedTemplate.id === 'microsoft' ? (
            <Box>
              <Box width={20}>
                <Text>Tenant ID: </Text>
              </Box>
              <TextInput
                value={tenant}
                onChange={setTenant}
                placeholder="your-tenant-id or 'common'"
              />
            </Box>
          ) : selectedTemplate.id === 'keycloak' ? (
            <>
              <Box>
                <Box width={20}>
                  <Text>Domain: </Text>
                </Box>
                <TextInput
                  value={customDomain}
                  onChange={setCustomDomain}
                  placeholder="keycloak.example.com"
                />
              </Box>
              <Box>
                <Box width={20}>
                  <Text>Realm: </Text>
                </Box>
                <TextInput
                  value={realm}
                  onChange={setRealm}
                  placeholder="master"
                />
              </Box>
            </>
          ) : (
            <Box>
              <Box width={20}>
                <Text>Domain: </Text>
              </Box>
              <TextInput
                value={customDomain}
                onChange={setCustomDomain}
                placeholder={`your-domain${selectedTemplate.id === 'auth0' ? '.auth0.com' : '.okta.com'}`}
              />
            </Box>
          )}
        </Box>

        <Box marginTop={2} gap={2}>
          <Text color="green">[Enter] Continue</Text>
          <Text dimColor>[ESC] Back</Text>
        </Box>
      </Box>
    );
  }

  // Step 3: Enter Credentials
  if (step === 'credentials' && selectedTemplate) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            🔑 Enter {selectedTemplate.name} Credentials
          </Text>
        </Box>

        <Box flexDirection="column" gap={1}>
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

          {selectedTemplate.config.requiresClientSecret && (
            <Box>
              <Box width={20}>
                <Text color={activeField === 'clientSecret' ? 'cyan' : undefined}>
                  Client Secret: <Text color="red">*</Text>
                </Text>
              </Box>
              {activeField === 'clientSecret' ? (
                <TextInput
                  value={clientSecret}
                  onChange={setClientSecret}
                  placeholder="Enter client secret..."
                  mask="*"
                />
              ) : (
                <Text dimColor>
                  {clientSecret ? '•'.repeat(clientSecret.length) : '<client secret>'}
                </Text>
              )}
            </Box>
          )}
        </Box>

        {selectedTemplate.config.pkceRequired && (
          <Box marginTop={1} borderStyle="round" borderColor="blue" paddingX={1}>
            <Text color="blue">
              ℹ️ This provider requires PKCE for security
            </Text>
          </Box>
        )}

        <Box marginTop={2} gap={2}>
          <Text color={clientId && (!selectedTemplate.config.requiresClientSecret || clientSecret) ? 'green' : 'gray'}>
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