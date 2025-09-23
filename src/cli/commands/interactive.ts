/* eslint-disable no-console */

import inquirer from 'inquirer';
import chalk from 'chalk';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { homedir } from 'os';
import { authCommand } from './auth.js';
import { tokenCommand } from './token.js';
import { refreshCommand } from './refresh.js';
import { inspectCommand } from './inspect.js';
import { configInitCommand, configAddCommand, configListCommand } from './config.js';
import tokenManager from '../../core/TokenManager.js';
import { ProviderConfigManager } from '../../providers/ProviderConfig.js';
import type { OAuthTokenResponse } from '../../types/OAuth.js';

interface CommandHistoryEntry {
  timestamp: string;
  command: string;
  result?: string;
}

/**
 * Interactive CLI mode with menu-driven interface
 */
export class InteractiveCLI {
  private history: CommandHistoryEntry[] = [];
  private historyFile: string;
  private providerManager: ProviderConfigManager;

  constructor() {
    this.historyFile = resolve(homedir(), '.oauth-cli', 'history.json');
    this.providerManager = new ProviderConfigManager();
    this.loadHistory();
  }

  /**
   * Load command history from file
   */
  private loadHistory(): void {
    try {
      if (existsSync(this.historyFile)) {
        const data = readFileSync(this.historyFile, 'utf-8');
        this.history = JSON.parse(data);
      }
    } catch (error) {
      // Ignore history load errors
    }
  }

  /**
   * Save command history to file
   */
  private saveHistory(): void {
    try {
      const dir = dirname(this.historyFile);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(this.historyFile, JSON.stringify(this.history, null, 2));
    } catch (error) {
      // Ignore history save errors
    }
  }

  /**
   * Add entry to command history
   */
  private addToHistory(command: string, result?: string): void {
    this.history.push({
      timestamp: new Date().toISOString(),
      command,
      result,
    });
    // Keep last 100 entries
    if (this.history.length > 100) {
      this.history = this.history.slice(-100);
    }
    this.saveHistory();
  }

  /**
   * Main menu
   */
  async mainMenu(): Promise<void> {
    console.clear();
    console.log(chalk.blue('╔════════════════════════════════════╗'));
    console.log(chalk.blue('║     OAuth 2.0 Test Client          ║'));
    console.log(chalk.blue('║     Interactive Mode               ║'));
    console.log(chalk.blue('╚════════════════════════════════════╝'));
    console.log();

    const choices = [
      { name: '🔐 Authenticate with Provider', value: 'auth' },
      { name: '🎫 Request Token (Manual)', value: 'token' },
      { name: '🔄 Refresh Token', value: 'refresh' },
      { name: '🔍 Inspect JWT Token', value: 'inspect' },
      { name: '⚙️  Configure Providers', value: 'config' },
      { name: '📦 Manage Stored Tokens', value: 'tokens' },
      { name: '📜 View Command History', value: 'history' },
      { name: '❌ Exit', value: 'exit' },
    ];

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices,
      },
    ]);

    switch (action) {
      case 'auth':
        await this.authenticateFlow();
        break;
      case 'token':
        await this.requestTokenFlow();
        break;
      case 'refresh':
        await this.refreshTokenFlow();
        break;
      case 'inspect':
        await this.inspectTokenFlow();
        break;
      case 'config':
        await this.configureFlow();
        break;
      case 'tokens':
        await this.manageTokensFlow();
        break;
      case 'history':
        await this.viewHistory();
        break;
      case 'exit':
        console.log(chalk.green('👋 Goodbye!'));
        process.exit(0);
    }

    // Return to main menu after action
    await this.promptContinue();
    await this.mainMenu();
  }

  /**
   * Authentication flow
   */
  async authenticateFlow(): Promise<void> {
    console.clear();
    console.log(chalk.blue('🔐 Provider Authentication'));
    console.log();

    // Get available providers
    const providerIds = this.providerManager.listProviderIds();
    const customChoice = '+ Custom Provider';

    const { provider } = await inquirer.prompt([
      {
        type: 'list',
        name: 'provider',
        message: 'Select a provider:',
        choices: [...providerIds, customChoice],
      },
    ]);

    if (provider === customChoice) {
      // Custom provider flow
      const customAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'providerId',
          message: 'Enter provider ID:',
          validate: (input: string) => input.length > 0 || 'Provider ID is required',
        },
        {
          type: 'input',
          name: 'clientId',
          message: 'Enter Client ID:',
          validate: (input: string) => input.length > 0 || 'Client ID is required',
        },
        {
          type: 'password',
          name: 'clientSecret',
          message: 'Enter Client Secret (optional):',
        },
        {
          type: 'input',
          name: 'authorizationUrl',
          message: 'Enter Authorization URL:',
        },
        {
          type: 'input',
          name: 'tokenUrl',
          message: 'Enter Token URL:',
          validate: (input: string) => input.length > 0 || 'Token URL is required',
        },
      ]);

      // Execute authentication
      await this.executeAuthentication(customAnswers.providerId, customAnswers);
    } else {
      // Use preset provider
      const grantTypes = await this.selectGrantType(provider);

      const authAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'clientId',
          message: 'Enter Client ID:',
          validate: (input: string) => input.length > 0 || 'Client ID is required',
        },
        {
          type: 'password',
          name: 'clientSecret',
          message: 'Enter Client Secret (optional):',
        },
        {
          type: 'input',
          name: 'scope',
          message: 'Enter scopes (space-separated, optional):',
        },
      ]);

      authAnswers.grant = grantTypes;
      await this.executeAuthentication(provider, authAnswers);
    }
  }

  /**
   * Select grant type for provider
   */
  async selectGrantType(provider: string): Promise<string> {
    const preset = this.providerManager.getPreset(provider);
    const grantTypes = preset?.supportedGrantTypes || [
      'authorization_code',
      'client_credentials',
      'password',
      'urn:ietf:params:oauth:grant-type:device_code',
    ];

    const grantTypeMap: Record<string, string> = {
      'authorization_code': '🌐 Authorization Code (Web Apps)',
      'client_credentials': '🤖 Client Credentials (M2M)',
      'password': '🔑 Password (Username/Password)',
      'urn:ietf:params:oauth:grant-type:device_code': '📱 Device Code (Limited Input)',
      'implicit': '⚠️  Implicit (Deprecated)',
    };

    const choices = grantTypes
      .filter(gt => grantTypeMap[gt])
      .map(gt => ({
        name: grantTypeMap[gt],
        value: gt,
      }));

    const { grantType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'grantType',
        message: 'Select grant type:',
        choices,
      },
    ]);

    // Additional prompts for specific grant types
    if (grantType === 'password') {
      const credentials = await inquirer.prompt([
        {
          type: 'input',
          name: 'username',
          message: 'Enter username:',
          validate: (input: string) => input.length > 0 || 'Username is required',
        },
        {
          type: 'password',
          name: 'password',
          message: 'Enter password:',
          validate: (input: string) => input.length > 0 || 'Password is required',
        },
      ]);
      return grantType;
    }

    return grantType;
  }

  /**
   * Execute authentication command
   */
  private async executeAuthentication(provider: string, options: Record<string, unknown>): Promise<void> {
    try {
      this.addToHistory(`auth ${provider}`, 'success');
      await authCommand(provider, options);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.addToHistory(`auth ${provider}`, `error: ${errorMsg}`);
      console.error(chalk.red('Authentication failed:'), errorMsg);
    }
  }

  /**
   * Request token flow
   */
  async requestTokenFlow(): Promise<void> {
    console.clear();
    console.log(chalk.blue('🎫 Manual Token Request'));
    console.log();

    const grantTypes = [
      { name: '🌐 Authorization Code', value: 'authorization_code' },
      { name: '🤖 Client Credentials', value: 'client_credentials' },
      { name: '🔑 Resource Owner Password', value: 'password' },
      { name: '📱 Device Code', value: 'urn:ietf:params:oauth:grant-type:device_code' },
      { name: '🔄 Refresh Token', value: 'refresh_token' },
    ];

    const { grantType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'grantType',
        message: 'Select grant type:',
        choices: grantTypes,
      },
    ]);

    const baseAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'clientId',
        message: 'Enter Client ID:',
        validate: (input: string) => input.length > 0 || 'Client ID is required',
      },
      {
        type: 'password',
        name: 'clientSecret',
        message: 'Enter Client Secret:',
      },
      {
        type: 'input',
        name: 'tokenUrl',
        message: 'Enter Token URL:',
        validate: (input: string) => input.length > 0 || 'Token URL is required',
      },
    ]);

    // Grant-specific prompts
    let grantAnswers: Record<string, unknown> = {};

    switch (grantType) {
      case 'authorization_code':
        grantAnswers = await inquirer.prompt([
          {
            type: 'input',
            name: 'code',
            message: 'Enter Authorization Code:',
            validate: (input: string) => input.length > 0 || 'Code is required',
          },
          {
            type: 'input',
            name: 'redirectUri',
            message: 'Enter Redirect URI:',
            default: 'http://localhost:3000/callback',
          },
          {
            type: 'confirm',
            name: 'usePkce',
            message: 'Use PKCE?',
            default: true,
          },
        ]);
        break;

      case 'password':
        grantAnswers = await inquirer.prompt([
          {
            type: 'input',
            name: 'username',
            message: 'Enter Username:',
            validate: (input: string) => input.length > 0 || 'Username is required',
          },
          {
            type: 'password',
            name: 'password',
            message: 'Enter Password:',
            validate: (input: string) => input.length > 0 || 'Password is required',
          },
        ]);
        break;

      case 'refresh_token':
        grantAnswers = await inquirer.prompt([
          {
            type: 'input',
            name: 'refreshToken',
            message: 'Enter Refresh Token:',
            validate: (input: string) => input.length > 0 || 'Refresh token is required',
          },
        ]);
        break;

      case 'urn:ietf:params:oauth:grant-type:device_code':
        grantAnswers = await inquirer.prompt([
          {
            type: 'input',
            name: 'deviceAuthorizationUrl',
            message: 'Enter Device Authorization URL:',
            validate: (input: string) => input.length > 0 || 'URL is required',
          },
        ]);
        break;
    }

    // Scope prompt
    const { scope } = await inquirer.prompt([
      {
        type: 'input',
        name: 'scope',
        message: 'Enter scopes (space-separated, optional):',
      },
    ]);

    // Combine options
    const options = {
      ...baseAnswers,
      ...grantAnswers,
      scope,
      output: 'text',
    };

    try {
      this.addToHistory(`token ${grantType}`, 'success');
      await tokenCommand(grantType, options);
      // Token command already handles clipboard copy
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.addToHistory(`token ${grantType}`, `error: ${errorMsg}`);
      console.error(chalk.red('Token request failed:'), errorMsg);
    }
  }

  /**
   * Refresh token flow
   */
  async refreshTokenFlow(): Promise<void> {
    console.clear();
    console.log(chalk.blue('🔄 Refresh Token'));
    console.log();

    const providers = tokenManager.listProviders();

    if (providers.length === 0) {
      console.log(chalk.yellow('No stored tokens found'));
      return;
    }

    const { provider } = await inquirer.prompt([
      {
        type: 'list',
        name: 'provider',
        message: 'Select provider to refresh:',
        choices: [...providers, '+ Manual Refresh'],
      },
    ]);

    if (provider === '+ Manual Refresh') {
      const manualAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'refreshToken',
          message: 'Enter Refresh Token:',
          validate: (input: string) => input.length > 0 || 'Refresh token is required',
        },
        {
          type: 'input',
          name: 'clientId',
          message: 'Enter Client ID:',
          validate: (input: string) => input.length > 0 || 'Client ID is required',
        },
        {
          type: 'password',
          name: 'clientSecret',
          message: 'Enter Client Secret:',
        },
        {
          type: 'input',
          name: 'tokenUrl',
          message: 'Enter Token URL:',
          validate: (input: string) => input.length > 0 || 'Token URL is required',
        },
      ]);

      try {
        this.addToHistory('refresh manual', 'success');
        await refreshCommand(manualAnswers.refreshToken, manualAnswers);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        this.addToHistory('refresh manual', `error: ${errorMsg}`);
        console.error(chalk.red('Refresh failed:'), errorMsg);
      }
    } else {
      try {
        this.addToHistory(`refresh ${provider}`, 'success');
        await refreshCommand(provider, { output: 'text' });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        this.addToHistory(`refresh ${provider}`, `error: ${errorMsg}`);
        console.error(chalk.red('Refresh failed:'), errorMsg);
      }
    }
  }

  /**
   * Inspect token flow
   */
  async inspectTokenFlow(): Promise<void> {
    console.clear();
    console.log(chalk.blue('🔍 JWT Token Inspector'));
    console.log();

    const { source } = await inquirer.prompt([
      {
        type: 'list',
        name: 'source',
        message: 'Token source:',
        choices: [
          { name: 'Enter JWT manually', value: 'manual' },
          { name: 'Use stored token', value: 'stored' },
        ],
      },
    ]);

    let token: string | undefined;

    if (source === 'manual') {
      const { jwtToken } = await inquirer.prompt([
        {
          type: 'input',
          name: 'jwtToken',
          message: 'Enter JWT token:',
          validate: (input: string) => {
            if (!input) return 'Token is required';
            const parts = input.split('.');
            if (parts.length !== 3) return 'Invalid JWT format (should be xxx.yyy.zzz)';
            return true;
          },
        },
      ]);
      token = jwtToken;
    } else {
      const providers = tokenManager.listProviders();
      if (providers.length === 0) {
        console.log(chalk.yellow('No stored tokens found'));
        return;
      }

      const { provider } = await inquirer.prompt([
        {
          type: 'list',
          name: 'provider',
          message: 'Select provider:',
          choices: providers,
        },
      ]);

      const storedToken = await tokenManager.getToken(provider);
      if (storedToken) {
        token = storedToken.access_token;
      }
    }

    if (token) {
      const { options } = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'options',
          message: 'Select inspection options:',
          choices: [
            { name: 'Show raw token parts', value: 'raw' },
            { name: 'Validate structure', value: 'validate' },
          ],
        },
      ]);

      try {
        this.addToHistory('inspect token', 'success');
        const opts = {
          raw: options.includes('raw'),
          validate: options.includes('validate'),
        };
        await inspectCommand(token, opts);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        this.addToHistory('inspect token', `error: ${errorMsg}`);
        console.error(chalk.red('Inspection failed:'), errorMsg);
      }
    }
  }

  /**
   * Configuration flow
   */
  async configureFlow(): Promise<void> {
    console.clear();
    console.log(chalk.blue('⚙️  Provider Configuration'));
    console.log();

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Configuration action:',
        choices: [
          { name: 'Initialize new config file', value: 'init' },
          { name: 'Add provider to config', value: 'add' },
          { name: 'List configured providers', value: 'list' },
        ],
      },
    ]);

    switch (action) {
      case 'init':
        try {
          this.addToHistory('config:init', 'success');
          await configInitCommand({ interactive: true });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          this.addToHistory('config:init', `error: ${errorMsg}`);
          console.error(chalk.red('Init failed:'), errorMsg);
        }
        break;

      case 'add':
        const providerIds = this.providerManager.listProviderIds();
        const { provider } = await inquirer.prompt([
          {
            type: 'list',
            name: 'provider',
            message: 'Select provider to add:',
            choices: providerIds,
          },
        ]);

        try {
          this.addToHistory(`config:add ${provider}`, 'success');
          await configAddCommand(provider, { interactive: true });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          this.addToHistory(`config:add ${provider}`, `error: ${errorMsg}`);
          console.error(chalk.red('Add failed:'), errorMsg);
        }
        break;

      case 'list':
        try {
          this.addToHistory('config:list', 'success');
          await configListCommand({});
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          this.addToHistory('config:list', `error: ${errorMsg}`);
          console.error(chalk.red('List failed:'), errorMsg);
        }
        break;
    }
  }

  /**
   * Manage tokens flow
   */
  async manageTokensFlow(): Promise<void> {
    console.clear();
    console.log(chalk.blue('📦 Token Management'));
    console.log();

    const providers = tokenManager.listProviders();

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Token action:',
        choices: [
          { name: `List stored tokens (${providers.length} found)`, value: 'list' },
          { name: 'Remove specific token', value: 'remove' },
          { name: 'Clear all tokens', value: 'clear' },
        ],
      },
    ]);

    switch (action) {
      case 'list':
        if (providers.length === 0) {
          console.log(chalk.yellow('No stored tokens'));
        } else {
          console.log(chalk.blue('Stored tokens:'));
          for (const provider of providers) {
            const token = await tokenManager.getToken(provider);
            if (token) {
              const preview = token.access_token.substring(0, 30) + '...';
              console.log(chalk.gray(`• ${provider}: ${preview}`));
              if (token.expires_at) {
                const expiresIn = Math.floor((token.expires_at - Date.now()) / 1000);
                if (expiresIn > 0) {
                  console.log(chalk.gray(`  Expires in: ${this.formatDuration(expiresIn)}`));
                } else {
                  console.log(chalk.red(`  Expired`));
                }
              }
            }
          }
        }
        this.addToHistory('tokens:list', `${providers.length} tokens`);
        break;

      case 'remove':
        if (providers.length === 0) {
          console.log(chalk.yellow('No tokens to remove'));
          break;
        }

        const { provider } = await inquirer.prompt([
          {
            type: 'list',
            name: 'provider',
            message: 'Select token to remove:',
            choices: providers,
          },
        ]);

        try {
          await tokenManager.deleteToken(provider);
          console.log(chalk.green(`✓ Removed token for ${provider}`));
          this.addToHistory(`tokens:remove ${provider}`, 'success');
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          console.error(chalk.red('Failed to remove token:'), errorMsg);
          this.addToHistory(`tokens:remove ${provider}`, `error: ${errorMsg}`);
        }
        break;

      case 'clear':
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: 'Are you sure you want to clear all tokens?',
            default: false,
          },
        ]);

        if (confirm) {
          await tokenManager.clearAll();
          console.log(chalk.green('✓ All tokens cleared'));
          this.addToHistory('tokens:clear', 'success');
        } else {
          console.log(chalk.gray('Cancelled'));
        }
        break;
    }
  }

  /**
   * View command history
   */
  async viewHistory(): Promise<void> {
    console.clear();
    console.log(chalk.blue('📜 Command History'));
    console.log();

    if (this.history.length === 0) {
      console.log(chalk.yellow('No command history'));
      return;
    }

    // Show last 20 entries
    const recent = this.history.slice(-20).reverse();

    for (const entry of recent) {
      const date = new Date(entry.timestamp);
      const time = date.toLocaleTimeString();
      const status = entry.result?.startsWith('error') ? chalk.red('✗') : chalk.green('✓');

      console.log(chalk.gray(`[${time}]`), status, chalk.white(entry.command));
      if (entry.result?.startsWith('error')) {
        console.log(chalk.red(`  └─ ${entry.result}`));
      }
    }

    console.log();
    console.log(chalk.gray(`Total commands: ${this.history.length}`));

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'History actions:',
        choices: [
          { name: 'Back to main menu', value: 'back' },
          { name: 'Clear history', value: 'clear' },
        ],
      },
    ]);

    if (action === 'clear') {
      this.history = [];
      this.saveHistory();
      console.log(chalk.green('✓ History cleared'));
    }
  }

  /**
   * Offer to copy token to clipboard
   */
  private async offerTokenCopy(token?: string): Promise<void> {
    if (!token) return;

    try {
      const { copy } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'copy',
          message: 'Copy access token to clipboard?',
          default: false,
        },
      ]);

      if (copy) {
        const { ClipboardManager } = await import('../../utils/Clipboard.js');
        await ClipboardManager.copyToken(token, 'Access token');
      }
    } catch {
      // Ignore clipboard errors
    }
  }

  /**
   * Format duration in seconds to human-readable
   */
  private formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  }

  /**
   * Prompt to continue
   */
  private async promptContinue(): Promise<void> {
    console.log();
    await inquirer.prompt([
      {
        type: 'input',
        name: 'continue',
        message: 'Press Enter to continue...',
      },
    ]);
  }

  /**
   * Start interactive mode
   */
  async start(): Promise<void> {
    try {
      await this.mainMenu();
    } catch (error) {
      if (error instanceof Error && error.message.includes('force closed')) {
        console.log(chalk.yellow('\n👋 Exiting...'));
        process.exit(0);
      }
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  }
}

/**
 * Interactive command entry point
 */
export async function interactiveCommand(): Promise<void> {
  const cli = new InteractiveCLI();
  await cli.start();
}