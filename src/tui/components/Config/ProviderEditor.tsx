import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import { useKeyboard } from '../../hooks/useKeyboard.js';

interface ProviderEditorProps {
  provider?: any;
  onSave: (provider: any) => void;
  onCancel: () => void;
}

type FormField =
  | 'name'
  | 'type'
  | 'clientId'
  | 'clientSecret'
  | 'authorizationEndpoint'
  | 'tokenEndpoint'
  | 'issuer'
  | 'scope'
  | 'redirectUri';

export const ProviderEditor: React.FC<ProviderEditorProps> = ({
  provider,
  onSave,
  onCancel
}) => {
  const [name, setName] = useState(provider?.name || '');
  const [type, setType] = useState<'oauth2' | 'oidc'>(provider?.type || 'oauth2');
  const [clientId, setClientId] = useState(provider?.clientId || '');
  const [clientSecret, setClientSecret] = useState('');
  const [authorizationEndpoint, setAuthorizationEndpoint] = useState(provider?.authorizationEndpoint || '');
  const [tokenEndpoint, setTokenEndpoint] = useState(provider?.tokenEndpoint || '');
  const [issuer, setIssuer] = useState(provider?.issuer || '');
  const [scope, setScope] = useState(provider?.scope || '');
  const [redirectUri, setRedirectUri] = useState(provider?.redirectUri || 'http://localhost:8080/callback');
  const [activeField, setActiveField] = useState<FormField>('name');
  const [selectingType, setSelectingType] = useState(false);

  const fields: Array<{
    key: FormField;
    label: string;
    value: string;
    setter: (v: string) => void;
    required?: boolean;
    mask?: boolean;
    visible?: boolean;
  }> = [
    { key: 'name', label: 'Provider Name', value: name, setter: setName, required: true },
    { key: 'type', label: 'Provider Type', value: type, setter: () => {}, required: true },
    { key: 'clientId', label: 'Client ID', value: clientId, setter: setClientId, required: true },
    { key: 'clientSecret', label: 'Client Secret', value: clientSecret, setter: setClientSecret, mask: true },
    { key: 'issuer', label: 'Issuer URL', value: issuer, setter: setIssuer, visible: type === 'oidc' },
    { key: 'authorizationEndpoint', label: 'Authorization Endpoint', value: authorizationEndpoint, setter: setAuthorizationEndpoint, visible: type === 'oauth2' },
    { key: 'tokenEndpoint', label: 'Token Endpoint', value: tokenEndpoint, setter: setTokenEndpoint, visible: type === 'oauth2' },
    { key: 'scope', label: 'Default Scopes', value: scope, setter: setScope },
    { key: 'redirectUri', label: 'Redirect URI', value: redirectUri, setter: setRedirectUri },
  ];

  const visibleFields = fields.filter(f => f.visible !== false);
  const currentFieldIndex = visibleFields.findIndex(f => f.key === activeField);

  const handleSave = () => {
    if (!name || !clientId) {
      return;
    }

    const providerConfig = {
      id: provider?.id || name.toLowerCase().replace(/\s+/g, '-'),
      name,
      type,
      clientId,
      clientSecret: clientSecret || provider?.clientSecret,
      authorizationEndpoint: type === 'oauth2' ? authorizationEndpoint : undefined,
      tokenEndpoint: type === 'oauth2' ? tokenEndpoint : undefined,
      issuer: type === 'oidc' ? issuer : undefined,
      scope,
      redirectUri,
    };

    onSave(providerConfig);
  };

  const handleTypeSelect = (item: { value: string }) => {
    setType(item.value as 'oauth2' | 'oidc');
    setSelectingType(false);
  };

  useKeyboard({
    shortcuts: {
      tab: () => {
        if (!selectingType) {
          const nextIndex = (currentFieldIndex + 1) % visibleFields.length;
          setActiveField(visibleFields[nextIndex].key);
        }
      },
      'shift+tab': () => {
        if (!selectingType) {
          const prevIndex = currentFieldIndex > 0 ? currentFieldIndex - 1 : visibleFields.length - 1;
          setActiveField(visibleFields[prevIndex].key);
        }
      },
      enter: () => {
        if (activeField === 'type') {
          setSelectingType(!selectingType);
        } else if (!selectingType) {
          handleSave();
        }
      },
      escape: () => {
        if (selectingType) {
          setSelectingType(false);
        } else {
          onCancel();
        }
      },
    },
    enabled: true,
  });

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          {provider ? '✏️ Edit Provider' : '➕ Add New Provider'}
        </Text>
      </Box>

      <Box flexDirection="column" gap={1}>
        {visibleFields.map((field) => {
          const isActive = field.key === activeField;

          if (field.key === 'type') {
            return (
              <Box key={field.key} flexDirection="column">
                <Box>
                  <Box width={25}>
                    <Text color={isActive ? 'cyan' : undefined}>
                      {field.label}:
                      {field.required && <Text color="red"> *</Text>}
                    </Text>
                  </Box>
                  <Text color={type === 'oidc' ? 'blue' : 'green'}>
                    {type === 'oidc' ? 'OpenID Connect' : 'OAuth 2.0'}
                  </Text>
                  {isActive && <Text dimColor> [Enter to change]</Text>}
                </Box>
                {selectingType && isActive && (
                  <Box marginLeft={25} marginTop={1}>
                    <SelectInput
                      items={[
                        { label: 'OAuth 2.0', value: 'oauth2' },
                        { label: 'OpenID Connect', value: 'oidc' },
                      ]}
                      onSelect={handleTypeSelect}
                    />
                  </Box>
                )}
              </Box>
            );
          }

          return (
            <Box key={field.key}>
              <Box width={25}>
                <Text color={isActive ? 'cyan' : undefined}>
                  {field.label}:
                  {field.required && <Text color="red"> *</Text>}
                </Text>
              </Box>
              {isActive ? (
                <TextInput
                  value={field.value}
                  onChange={field.setter}
                  placeholder={`Enter ${field.label.toLowerCase()}...`}
                  mask={field.mask ? '*' : undefined}
                />
              ) : (
                <Text dimColor>
                  {field.mask && field.value
                    ? '•'.repeat(field.value.length)
                    : field.value || `<${field.label.toLowerCase()}>`}
                </Text>
              )}
            </Box>
          );
        })}
      </Box>

      <Box marginTop={2} flexDirection="column" gap={1}>
        <Box borderStyle="single" borderColor="blue" paddingX={1}>
          <Text color="blue">
            ℹ️ Provider Configuration Tips:
          </Text>
        </Box>
        <Box marginLeft={2} flexDirection="column">
          {type === 'oidc' ? (
            <>
              <Text dimColor>• OIDC will auto-discover endpoints from issuer URL</Text>
              <Text dimColor>• Issuer URL should end without trailing slash</Text>
              <Text dimColor>• Example: https://accounts.google.com</Text>
            </>
          ) : (
            <>
              <Text dimColor>• OAuth 2.0 requires manual endpoint configuration</Text>
              <Text dimColor>• Ensure endpoints are correct for your provider</Text>
              <Text dimColor>• Client secret is optional for public clients</Text>
            </>
          )}
        </Box>
      </Box>

      <Box marginTop={2} gap={2}>
        <Text color={name && clientId ? 'green' : 'gray'}>
          [Enter] Save Provider
        </Text>
        <Text dimColor>[Tab] Next Field</Text>
        <Text dimColor>[ESC] Cancel</Text>
      </Box>
    </Box>
  );
};