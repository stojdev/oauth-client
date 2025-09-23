/**
 * OAuth Scope Builder
 * Helps build and validate OAuth scopes for different providers
 */

export interface ScopePreset {
  name: string;
  description: string;
  scopes: string[];
  category?: string;
}

export interface ProviderScopes {
  provider: string;
  baseUrl?: string;
  categories?: string[];
  presets: ScopePreset[];
  customScopes?: string[];
}

/**
 * Common OAuth scope patterns across providers
 */
export class ScopeBuilder {
  private static providerScopes: Map<string, ProviderScopes> = new Map([
    [
      'google',
      {
        provider: 'Google',
        baseUrl: 'https://www.googleapis.com/auth/',
        categories: ['User Info', 'Google Services', 'Data Access'],
        presets: [
          {
            name: 'Basic Profile',
            description: 'Access to basic user profile information',
            scopes: ['openid', 'profile', 'email'],
            category: 'User Info',
          },
          {
            name: 'Google Drive',
            description: 'Access to Google Drive files',
            scopes: ['https://www.googleapis.com/auth/drive.readonly'],
            category: 'Google Services',
          },
          {
            name: 'Gmail Read',
            description: 'Read access to Gmail',
            scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
            category: 'Google Services',
          },
          {
            name: 'Calendar',
            description: 'Access to Google Calendar',
            scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
            category: 'Google Services',
          },
          {
            name: 'YouTube',
            description: 'Access to YouTube account',
            scopes: ['https://www.googleapis.com/auth/youtube.readonly'],
            category: 'Google Services',
          },
        ],
        customScopes: [
          'https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/userinfo.email',
        ],
      },
    ],
    [
      'github',
      {
        provider: 'GitHub',
        categories: ['User', 'Repository', 'Organization'],
        presets: [
          {
            name: 'Public Info',
            description: 'Access to public user information',
            scopes: ['read:user', 'user:email'],
            category: 'User',
          },
          {
            name: 'Repository Access',
            description: 'Access to public and private repositories',
            scopes: ['repo'],
            category: 'Repository',
          },
          {
            name: 'Repository Read-Only',
            description: 'Read-only access to repositories',
            scopes: ['repo:status', 'public_repo'],
            category: 'Repository',
          },
          {
            name: 'Gist',
            description: 'Create and manage gists',
            scopes: ['gist'],
            category: 'User',
          },
          {
            name: 'Organizations',
            description: 'Access to organization information',
            scopes: ['read:org'],
            category: 'Organization',
          },
          {
            name: 'Notifications',
            description: 'Access to notifications',
            scopes: ['notifications'],
            category: 'User',
          },
        ],
      },
    ],
    [
      'microsoft',
      {
        provider: 'Microsoft',
        categories: ['User Profile', 'Microsoft 365', 'Azure'],
        presets: [
          {
            name: 'Basic Profile',
            description: 'Basic user profile access',
            scopes: ['openid', 'profile', 'email', 'offline_access'],
            category: 'User Profile',
          },
          {
            name: 'User Read',
            description: 'Read user profile',
            scopes: ['User.Read'],
            category: 'User Profile',
          },
          {
            name: 'Mail Read',
            description: 'Read user mail',
            scopes: ['Mail.Read'],
            category: 'Microsoft 365',
          },
          {
            name: 'OneDrive',
            description: 'Access to OneDrive files',
            scopes: ['Files.Read'],
            category: 'Microsoft 365',
          },
          {
            name: 'Calendar',
            description: 'Access to calendar',
            scopes: ['Calendars.Read'],
            category: 'Microsoft 365',
          },
          {
            name: 'Teams',
            description: 'Access to Microsoft Teams',
            scopes: ['Team.ReadBasic.All'],
            category: 'Microsoft 365',
          },
        ],
      },
    ],
    [
      'aws-cognito',
      {
        provider: 'AWS Cognito',
        categories: ['OpenID', 'AWS Resources'],
        presets: [
          {
            name: 'OpenID Profile',
            description: 'Standard OpenID Connect scopes',
            scopes: ['openid', 'profile', 'email'],
            category: 'OpenID',
          },
          {
            name: 'Phone',
            description: 'Access to phone number',
            scopes: ['phone'],
            category: 'OpenID',
          },
          {
            name: 'AWS Cognito Admin',
            description: 'Administrative access',
            scopes: ['aws.cognito.signin.user.admin'],
            category: 'AWS Resources',
          },
        ],
      },
    ],
    [
      'okta',
      {
        provider: 'Okta',
        categories: ['OpenID', 'Okta Management'],
        presets: [
          {
            name: 'OpenID Basic',
            description: 'Basic OpenID Connect scopes',
            scopes: ['openid', 'profile', 'email'],
            category: 'OpenID',
          },
          {
            name: 'Offline Access',
            description: 'Refresh token support',
            scopes: ['openid', 'offline_access'],
            category: 'OpenID',
          },
          {
            name: 'Groups',
            description: 'Access to user groups',
            scopes: ['groups'],
            category: 'Okta Management',
          },
        ],
      },
    ],
    [
      'salesforce',
      {
        provider: 'Salesforce',
        categories: ['Platform', 'API Access'],
        presets: [
          {
            name: 'Basic Access',
            description: 'Basic Salesforce access',
            scopes: ['id', 'api', 'refresh_token'],
            category: 'Platform',
          },
          {
            name: 'Full Access',
            description: 'Full Salesforce access',
            scopes: ['full', 'refresh_token'],
            category: 'Platform',
          },
          {
            name: 'Chatter',
            description: 'Access to Chatter API',
            scopes: ['chatter_api'],
            category: 'API Access',
          },
          {
            name: 'Custom Apps',
            description: 'Access to custom applications',
            scopes: ['custom_permissions'],
            category: 'API Access',
          },
        ],
      },
    ],
    [
      'auth0',
      {
        provider: 'Auth0',
        categories: ['OpenID', 'Auth0 Management'],
        presets: [
          {
            name: 'OpenID Profile',
            description: 'Standard OpenID Connect',
            scopes: ['openid', 'profile', 'email'],
            category: 'OpenID',
          },
          {
            name: 'Offline Access',
            description: 'Refresh token support',
            scopes: ['openid', 'offline_access'],
            category: 'OpenID',
          },
          {
            name: 'Management API',
            description: 'Access to Auth0 Management API',
            scopes: ['create:users', 'read:users', 'update:users'],
            category: 'Auth0 Management',
          },
        ],
      },
    ],
  ]);

  /**
   * Get scope presets for a provider
   */
  static getProviderScopes(providerId: string): ProviderScopes | undefined {
    return this.providerScopes.get(providerId);
  }

  /**
   * Get all available providers with scope presets
   */
  static getAvailableProviders(): string[] {
    return Array.from(this.providerScopes.keys());
  }

  /**
   * Build scope string from selected presets
   */
  static buildScopeString(providerId: string, presetNames: string[]): string {
    const provider = this.providerScopes.get(providerId);
    if (!provider) {
      return '';
    }

    const scopes = new Set<string>();
    for (const presetName of presetNames) {
      const preset = provider.presets.find(p => p.name === presetName);
      if (preset) {
        preset.scopes.forEach(s => scopes.add(s));
      }
    }

    return Array.from(scopes).join(' ');
  }

  /**
   * Combine multiple scopes ensuring no duplicates
   */
  static combineScopes(...scopeStrings: string[]): string {
    const allScopes = new Set<string>();

    for (const scopeString of scopeStrings) {
      if (scopeString) {
        const scopes = scopeString.split(/\s+/).filter(Boolean);
        scopes.forEach(s => allScopes.add(s));
      }
    }

    return Array.from(allScopes).join(' ');
  }

  /**
   * Parse scope string to array
   */
  static parseScopes(scopeString: string): string[] {
    return scopeString.split(/\s+/).filter(Boolean);
  }

  /**
   * Validate if scopes match provider expectations
   */
  static validateScopes(providerId: string, scopeString: string): {
    valid: boolean;
    warnings: string[];
    suggestions: string[];
  } {
    const provider = this.providerScopes.get(providerId);
    const scopes = this.parseScopes(scopeString);
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (!provider) {
      return {
        valid: true,
        warnings: ['Provider scope information not available'],
        suggestions: [],
      };
    }

    // Check for OpenID Connect consistency
    if (scopes.includes('openid')) {
      if (!scopes.includes('profile') && !scopes.includes('email')) {
        suggestions.push("Consider adding 'profile' or 'email' with 'openid'");
      }
    }

    // Check for refresh token requirements
    if (scopes.includes('offline_access') && !scopes.includes('openid')) {
      warnings.push("'offline_access' typically requires 'openid' scope");
    }

    // Provider-specific validations
    switch (providerId) {
      case 'google':
        // Check for deprecated scopes
        if (scopes.some(s => s.includes('googleapis.com/auth/plus'))) {
          warnings.push('Google+ scopes are deprecated');
        }
        break;

      case 'microsoft':
        // Check for graph API consistency
        if (scopes.some(s => s.includes('.Read')) &&
            scopes.some(s => s.includes('.Write'))) {
          suggestions.push('Consider using .ReadWrite scope instead of separate Read/Write');
        }
        break;

      case 'github':
        // Check for scope hierarchy
        if (scopes.includes('repo') && scopes.includes('public_repo')) {
          warnings.push("'repo' scope includes 'public_repo' access");
        }
        break;
    }

    return {
      valid: warnings.length === 0,
      warnings,
      suggestions,
    };
  }

  /**
   * Get commonly used scope combinations
   */
  static getCommonCombinations(providerId: string): Array<{
    name: string;
    description: string;
    scopes: string;
  }> {
    const commonCombos: Record<string, Array<{ name: string; description: string; scopes: string }>> = {
      google: [
        {
          name: 'Basic Authentication',
          description: 'Minimal scopes for authentication',
          scopes: 'openid email',
        },
        {
          name: 'Full Profile',
          description: 'Complete user profile access',
          scopes: 'openid profile email',
        },
        {
          name: 'Google Workspace',
          description: 'Access to Drive, Gmail, and Calendar',
          scopes: 'openid email https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly',
        },
      ],
      github: [
        {
          name: 'Public Access',
          description: 'Read public information only',
          scopes: 'read:user public_repo',
        },
        {
          name: 'Developer Access',
          description: 'Full repository and user access',
          scopes: 'repo user gist',
        },
        {
          name: 'CI/CD Access',
          description: 'Repository and workflow access',
          scopes: 'repo workflow',
        },
      ],
      microsoft: [
        {
          name: 'Basic Sign-In',
          description: 'Simple authentication',
          scopes: 'openid profile email',
        },
        {
          name: 'Microsoft 365 User',
          description: 'Access to email and files',
          scopes: 'User.Read Mail.Read Files.Read',
        },
        {
          name: 'Full Microsoft 365',
          description: 'Complete Microsoft 365 access',
          scopes: 'User.Read Mail.ReadWrite Files.ReadWrite Calendars.ReadWrite Teams.ReadBasic.All',
        },
      ],
    };

    return commonCombos[providerId] || [];
  }

  /**
   * Generate scope documentation URL for provider
   */
  static getScopeDocumentationUrl(providerId: string): string | undefined {
    const docs: Record<string, string> = {
      google: 'https://developers.google.com/identity/protocols/oauth2/scopes',
      github: 'https://docs.github.com/en/developers/apps/building-oauth-apps/scopes-for-oauth-apps',
      microsoft: 'https://docs.microsoft.com/en-us/graph/permissions-reference',
      'aws-cognito': 'https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-define-resource-servers.html',
      okta: 'https://developer.okta.com/docs/reference/api/oidc/#scopes',
      salesforce: 'https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_scopes.htm',
      auth0: 'https://auth0.com/docs/get-started/apis/scopes',
    };

    return docs[providerId];
  }

  /**
   * Check if a scope string contains refresh token capability
   */
  static hasRefreshTokenScope(scopeString: string): boolean {
    const scopes = this.parseScopes(scopeString);
    const refreshScopes = ['offline_access', 'refresh_token'];
    return scopes.some(scope => refreshScopes.includes(scope));
  }

  /**
   * Suggest scopes based on use case
   */
  static suggestScopesForUseCase(
    providerId: string,
    useCase: 'authentication' | 'read-only' | 'full-access' | 'admin'
  ): string {
    const provider = this.providerScopes.get(providerId);
    if (!provider) {
      return '';
    }

    switch (useCase) {
      case 'authentication':
        // Return basic authentication scopes
        const authPreset = provider.presets.find(p =>
          p.name.toLowerCase().includes('basic') ||
          p.name.toLowerCase().includes('profile')
        );
        return authPreset ? authPreset.scopes.join(' ') : 'openid profile email';

      case 'read-only':
        // Return read-only scopes
        const readPresets = provider.presets.filter(p =>
          p.scopes.some(s => s.includes('read') || s.includes('readonly'))
        );
        return readPresets.flatMap(p => p.scopes).join(' ');

      case 'full-access':
        // Return comprehensive scopes
        return provider.presets.flatMap(p => p.scopes).join(' ');

      case 'admin':
        // Return admin/management scopes
        const adminPresets = provider.presets.filter(p =>
          p.name.toLowerCase().includes('admin') ||
          p.name.toLowerCase().includes('management') ||
          p.scopes.some(s => s.includes('admin'))
        );
        return adminPresets.flatMap(p => p.scopes).join(' ');

      default:
        return '';
    }
  }
}