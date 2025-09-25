import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import { useKeyboard } from '../../hooks/useKeyboard.js';
import { ProviderConfig } from '../../../types/index.js';
import { ClientAuthMethod } from '../../../utils/ClientAuth.js';

export interface ConfigEditorProps {
  provider?: ProviderConfig;
  onSave: (provider: ProviderConfig) => void;
  onCancel: () => void;
  onTest: () => void;
}

interface ValidationError {
  field: string;
  message: string;
}

type FormField =
  | 'name'
  | 'displayName'
  | 'authorizationUrl'
  | 'tokenUrl'
  | 'userInfoUrl'
  | 'revocationUrl'
  | 'introspectionUrl'
  | 'discoveryUrl'
  | 'authMethod'
  | 'scopes'
  | 'defaultScopes';

interface ScopeEntry {
  key: string;
  description: string;
}

const AUTH_METHOD_OPTIONS = [
  { label: 'Client Secret Basic (Recommended)', value: ClientAuthMethod.ClientSecretBasic },
  { label: 'Client Secret Post', value: ClientAuthMethod.ClientSecretPost },
  { label: 'Client Secret JWT', value: ClientAuthMethod.ClientSecretJWT },
  { label: 'Private Key JWT', value: ClientAuthMethod.PrivateKeyJWT },
  { label: 'None (Public Client)', value: ClientAuthMethod.None }
];

/**
 * Validates a URL format
 */
const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validates HTTPS URL (required for production OAuth)
 */
const isHttpsUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export const ConfigEditor: React.FC<ConfigEditorProps> = ({
  provider,
  onSave,
  onCancel,
  onTest
}) => {
  // Form state
  const [name, setName] = useState(provider?.name || '');
  const [displayName, setDisplayName] = useState(provider?.displayName || '');
  const [authorizationUrl, setAuthorizationUrl] = useState(provider?.authorizationUrl || '');
  const [tokenUrl, setTokenUrl] = useState(provider?.tokenUrl || '');
  const [userInfoUrl, setUserInfoUrl] = useState(provider?.userInfoUrl || '');
  const [revocationUrl, setRevocationUrl] = useState(provider?.revocationUrl || '');
  const [introspectionUrl, setIntrospectionUrl] = useState(provider?.introspectionUrl || '');
  const [discoveryUrl, setDiscoveryUrl] = useState(provider?.discoveryUrl || '');
  const [authMethod, setAuthMethod] = useState<ClientAuthMethod>(
    provider?.authMethod || ClientAuthMethod.ClientSecretBasic
  );
  const [customScopes, setCustomScopes] = useState<ScopeEntry[]>(
    provider?.scopes ? Object.entries(provider.scopes).map(([key, description]) => ({
      key,
      description: typeof description === 'string' ? description : key
    })) : []
  );
  const [defaultScopes] = useState<string[]>(provider?.defaultScopes || []);

  // UI state
  const [activeField, setActiveField] = useState<FormField>('name');
  const [selectingAuthMethod, setSelectingAuthMethod] = useState(false);
  const [editingScopes, setEditingScopes] = useState(false);
  const [newScopeKey, setNewScopeKey] = useState('');
  const [newScopeDescription, setNewScopeDescription] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // Field definitions
  const fields: Array<{
    key: FormField;
    label: string;
    value: string;
    setter: (v: string) => void;
    required?: boolean;
    urlValidation?: boolean;
    httpsRequired?: boolean;
  }> = [
    {
      key: 'name',
      label: 'Provider Name',
      value: name,
      setter: setName,
      required: true
    },
    {
      key: 'displayName',
      label: 'Display Name',
      value: displayName,
      setter: setDisplayName,
      required: true
    },
    {
      key: 'authorizationUrl',
      label: 'Authorization URL',
      value: authorizationUrl,
      setter: setAuthorizationUrl,
      required: true,
      urlValidation: true,
      httpsRequired: true
    },
    {
      key: 'tokenUrl',
      label: 'Token URL',
      value: tokenUrl,
      setter: setTokenUrl,
      required: true,
      urlValidation: true,
      httpsRequired: true
    },
    {
      key: 'userInfoUrl',
      label: 'User Info URL',
      value: userInfoUrl,
      setter: setUserInfoUrl,
      urlValidation: true,
      httpsRequired: true
    },
    {
      key: 'revocationUrl',
      label: 'Revocation URL',
      value: revocationUrl,
      setter: setRevocationUrl,
      urlValidation: true,
      httpsRequired: true
    },
    {
      key: 'introspectionUrl',
      label: 'Introspection URL',
      value: introspectionUrl,
      setter: setIntrospectionUrl,
      urlValidation: true,
      httpsRequired: true
    },
    {
      key: 'discoveryUrl',
      label: 'Discovery URL',
      value: discoveryUrl,
      setter: setDiscoveryUrl,
      urlValidation: true,
      httpsRequired: true
    }
  ];

  // Validation
  const validateForm = (): ValidationError[] => {
    const errors: ValidationError[] = [];

    fields.forEach(field => {
      if (field.required && !field.value.trim()) {
        errors.push({ field: field.key, message: `${field.label} is required` });
      }

      if (field.value.trim() && field.urlValidation) {
        if (!isValidUrl(field.value)) {
          errors.push({ field: field.key, message: `${field.label} must be a valid URL` });
        } else if (field.httpsRequired && !isHttpsUrl(field.value)) {
          errors.push({ field: field.key, message: `${field.label} must use HTTPS for security` });
        }
      }
    });

    // Validate provider name uniqueness (basic check)
    if (name.trim() && !/^[a-zA-Z0-9_-]+$/.test(name)) {
      errors.push({
        field: 'name',
        message: 'Provider name can only contain letters, numbers, hyphens, and underscores'
      });
    }

    return errors;
  };

  // Real-time validation
  useEffect(() => {
    const errors = validateForm();
    setValidationErrors(errors);
  }, [name, displayName, authorizationUrl, tokenUrl, userInfoUrl, revocationUrl, introspectionUrl, discoveryUrl]);

  // Get current field index for navigation
  const currentFieldIndex = fields.findIndex(f => f.key === activeField);

  const handleSave = () => {
    const errors = validateForm();
    if (errors.length > 0) {
      return; // Don't save if validation fails
    }

    const scopesObject: Record<string, string> = {};
    customScopes.forEach(scope => {
      if (scope.key.trim()) {
        scopesObject[scope.key] = scope.description || scope.key;
      }
    });

    const providerConfig: ProviderConfig = {
      name: name.trim(),
      displayName: displayName.trim(),
      authorizationUrl: authorizationUrl.trim(),
      tokenUrl: tokenUrl.trim(),
      userInfoUrl: userInfoUrl.trim() || undefined,
      revocationUrl: revocationUrl.trim() || undefined,
      introspectionUrl: introspectionUrl.trim() || undefined,
      discoveryUrl: discoveryUrl.trim() || undefined,
      scopes: Object.keys(scopesObject).length > 0 ? scopesObject : undefined,
      defaultScopes: defaultScopes.length > 0 ? defaultScopes : undefined,
      authMethod,
      supportedAuthMethods: [authMethod] // Start with selected method
    };

    onSave(providerConfig);
  };

  const handleAuthMethodSelect = (item: { value: ClientAuthMethod }) => {
    setAuthMethod(item.value);
    setSelectingAuthMethod(false);
  };

  const addScope = () => {
    if (newScopeKey.trim()) {
      const newScope: ScopeEntry = {
        key: newScopeKey.trim(),
        description: newScopeDescription.trim() || newScopeKey.trim()
      };
      setCustomScopes([...customScopes, newScope]);
      setNewScopeKey('');
      setNewScopeDescription('');
      setEditingScopes(false);
    }
  };


  // Navigation helpers
  const navigateNext = () => {
    if (editingScopes) return;
    if (selectingAuthMethod) return;

    const nextIndex = (currentFieldIndex + 1) % fields.length;
    setActiveField(fields[nextIndex].key);
  };

  const navigatePrevious = () => {
    if (editingScopes) return;
    if (selectingAuthMethod) return;

    const prevIndex = currentFieldIndex > 0 ? currentFieldIndex - 1 : fields.length - 1;
    setActiveField(fields[prevIndex].key);
  };

  useKeyboard({
    shortcuts: {
      tab: navigateNext,
      'shift+tab': navigatePrevious,
      enter: () => {
        if (activeField === 'authMethod') {
          setSelectingAuthMethod(!selectingAuthMethod);
        } else if (activeField === 'scopes') {
          setEditingScopes(true);
        } else if (editingScopes && newScopeKey.trim()) {
          addScope();
        } else if (!selectingAuthMethod && !editingScopes) {
          handleSave();
        }
      },
      escape: () => {
        if (selectingAuthMethod) {
          setSelectingAuthMethod(false);
        } else if (editingScopes) {
          setEditingScopes(false);
          setNewScopeKey('');
          setNewScopeDescription('');
        } else {
          onCancel();
        }
      },
      'ctrl+t': () => {
        if (validationErrors.length === 0) {
          onTest();
        }
      },
      'ctrl+s': () => {
        handleSave();
      }
    },
    enabled: true,
  });

  const getFieldError = (fieldKey: string): string | undefined => {
    return validationErrors.find(e => e.field === fieldKey)?.message;
  };

  const isFormValid = validationErrors.length === 0 && name.trim() && displayName.trim() &&
                     authorizationUrl.trim() && tokenUrl.trim();

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          {provider ? '✏️ Edit Provider Configuration' : '➕ Add New Provider Configuration'}
        </Text>
      </Box>

      {/* Main form fields */}
      <Box flexDirection="column" gap={1}>
        {fields.map((field) => {
          const isActive = field.key === activeField;
          const error = getFieldError(field.key);

          return (
            <Box key={field.key} flexDirection="column">
              <Box>
                <Box width={20}>
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
                  />
                ) : (
                  <Text dimColor>
                    {field.value || `<${field.label.toLowerCase()}>`}
                  </Text>
                )}
              </Box>
              {error && (
                <Box marginLeft={20}>
                  <Text color="red">⚠️ {error}</Text>
                </Box>
              )}
            </Box>
          );
        })}

        {/* Auth Method Selection */}
        <Box flexDirection="column">
          <Box>
            <Box width={20}>
              <Text color={activeField === 'authMethod' ? 'cyan' : undefined}>
                Auth Method:
              </Text>
            </Box>
            <Text color="yellow">
              {AUTH_METHOD_OPTIONS.find(o => o.value === authMethod)?.label}
            </Text>
            {activeField === 'authMethod' && <Text dimColor> [Enter to change]</Text>}
          </Box>
          {selectingAuthMethod && activeField === 'authMethod' && (
            <Box marginLeft={20} marginTop={1}>
              <SelectInput
                items={AUTH_METHOD_OPTIONS}
                onSelect={handleAuthMethodSelect}
              />
            </Box>
          )}
        </Box>

        {/* Scopes Configuration */}
        <Box flexDirection="column">
          <Box>
            <Box width={20}>
              <Text color={activeField === 'scopes' ? 'cyan' : undefined}>
                Scopes:
              </Text>
            </Box>
            <Text dimColor>
              {customScopes.length > 0 ? `${customScopes.length} configured` : 'None configured'}
              {activeField === 'scopes' && <Text dimColor> [Enter to edit]</Text>}
            </Text>
          </Box>

          {editingScopes && activeField === 'scopes' && (
            <Box marginLeft={20} marginTop={1} flexDirection="column">
              <Text bold color="yellow">Configure Scopes:</Text>

              {customScopes.map((scope, index) => (
                <Box key={index} marginTop={1}>
                  <Text color="green">• {scope.key}</Text>
                  <Text dimColor> - {scope.description}</Text>
                  <Text color="red" dimColor> [d to delete]</Text>
                </Box>
              ))}

              <Box marginTop={1} flexDirection="column">
                <Box>
                  <Text>New scope key: </Text>
                  <TextInput
                    value={newScopeKey}
                    onChange={setNewScopeKey}
                    placeholder="e.g., read:user"
                  />
                </Box>
                <Box marginTop={1}>
                  <Text>Description: </Text>
                  <TextInput
                    value={newScopeDescription}
                    onChange={setNewScopeDescription}
                    placeholder="Optional description"
                  />
                </Box>
                <Box marginTop={1}>
                  <Text dimColor>[Enter] Add scope • [ESC] Done</Text>
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      {/* Validation Summary */}
      {validationErrors.length > 0 && (
        <Box marginTop={2} borderStyle="single" borderColor="red" paddingX={1}>
          <Box flexDirection="column">
            <Text color="red" bold>⚠️ Validation Errors:</Text>
            {validationErrors.map((error, index) => (
              <Text key={index} color="red">• {error.message}</Text>
            ))}
          </Box>
        </Box>
      )}

      {/* Help Text */}
      <Box marginTop={2} borderStyle="single" borderColor="blue" paddingX={1}>
        <Box flexDirection="column">
          <Text color="blue" bold>ℹ️ Configuration Help:</Text>
          <Text dimColor>• All URLs must use HTTPS for production security</Text>
          <Text dimColor>• Provider name must be unique and URL-safe</Text>
          <Text dimColor>• Auth method determines how client credentials are sent</Text>
          <Text dimColor>• Optional URLs can be left empty if not supported</Text>
        </Box>
      </Box>

      {/* Action buttons */}
      <Box marginTop={2} gap={2}>
        <Text color={isFormValid ? 'green' : 'gray'}>
          [Enter] Save • [Ctrl+S] Save
        </Text>
        <Text color={isFormValid ? 'cyan' : 'gray'}>
          [Ctrl+T] Test Connection
        </Text>
        <Text dimColor>[Tab] Next • [ESC] Cancel</Text>
      </Box>
    </Box>
  );
};