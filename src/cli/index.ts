/* eslint-disable no-console */

import { Command } from 'commander';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { logger } from '../utils/Logger.js';
import tokenManager from '../core/TokenManager.js';
import { authCommand } from './commands/auth.js';
import { tokenCommand } from './commands/token.js';
import { inspectCommand } from './commands/inspect.js';
import { refreshCommand } from './commands/refresh.js';
import { configInitCommand, configAddCommand, configListCommand } from './commands/config.js';

// Load environment variables
dotenv.config();

const program = new Command();

program.name('oauth').description('OAuth 2.0 Test Client').version('1.0.0');

// Auth command - authenticate with a provider
program
  .command('auth <provider>')
  .description('Authenticate with a provider')
  .option('-g, --grant <type>', 'Grant type to use')
  .option('-c, --config <file>', 'Configuration file')
  .option('--client-id <id>', 'OAuth client ID')
  .option('--client-secret <secret>', 'OAuth client secret')
  .option('-u, --username <username>', 'Username (for password grant)')
  .option('-p, --password <password>', 'Password (for password grant)')
  .option('-s, --scope <scope>', 'OAuth scope')
  .option('--no-save', 'Do not save token')
  .option('-o, --output <format>', 'Output format (json|text)', 'text')
  .action(authCommand);

// Token command - request token with specific grant
program
  .command('token <grant-type>')
  .description('Request token using specific grant type')
  .option('--client-id <id>', 'OAuth client ID')
  .option('--client-secret <secret>', 'OAuth client secret')
  .option('--token-url <url>', 'Token endpoint URL')
  .option('--authorization-url <url>', 'Authorization endpoint URL')
  .option('--device-authorization-url <url>', 'Device authorization URL')
  .option('--redirect-uri <uri>', 'Redirect URI')
  .option('-u, --username <username>', 'Username (for password grant)')
  .option('-p, --password <password>', 'Password (for password grant)')
  .option('--refresh-token <token>', 'Refresh token')
  .option('-s, --scope <scope>', 'OAuth scope')
  .option('--code <code>', 'Authorization code')
  .option('--no-pkce', 'Disable PKCE')
  .option('--save <name>', 'Save token with name')
  .option('-o, --output <format>', 'Output format (json|text)', 'text')
  .action(tokenCommand);

// Refresh command
program
  .command('refresh [token-or-provider]')
  .description('Refresh an access token')
  .option('--client-id <id>', 'OAuth client ID')
  .option('--client-secret <secret>', 'OAuth client secret')
  .option('--token-url <url>', 'Token endpoint URL')
  .option('--no-save', 'Do not save refreshed token')
  .option('-o, --output <format>', 'Output format (json|text)', 'text')
  .action(refreshCommand);

// Inspect command
program
  .command('inspect [token]')
  .description('Decode and inspect a JWT token')
  .option('-p, --provider <name>', 'Get token from provider')
  .option('-r, --raw', 'Show raw token parts')
  .option('-v, --validate', 'Validate token structure')
  .action(inspectCommand);

// Revoke command
program
  .command('revoke <token>')
  .description('Revoke a token')
  .option('--revocation-url <url>', 'Revocation endpoint URL')
  .option('--client-id <id>', 'OAuth client ID')
  .option('--client-secret <secret>', 'OAuth client secret')
  .action(async (token, options) => {
    const { revokeCommand } = await import('./commands/revoke.js');
    await revokeCommand(token, options);
  });

// Config init command
program
  .command('config:init')
  .description('Initialize configuration file')
  .option('-f, --file <path>', 'Configuration file path')
  .option('-i, --interactive', 'Interactive mode')
  .action(configInitCommand);

// Config add command
program
  .command('config:add <provider>')
  .description('Add provider to configuration')
  .option('-f, --file <path>', 'Configuration file path')
  .option('--client-id <id>', 'OAuth client ID')
  .option('--client-secret <secret>', 'OAuth client secret')
  .option('--token-url <url>', 'Token endpoint URL')
  .option('--authorization-url <url>', 'Authorization endpoint URL')
  .option('-i, --interactive', 'Interactive mode')
  .action(configAddCommand);

// Config list command
program
  .command('config:list')
  .description('List configured providers')
  .option('-f, --file <path>', 'Configuration file path')
  .action(configListCommand);

// Discover command
program
  .command('discover <issuer-url>')
  .description('Discover OAuth configuration from issuer URL')
  .option('--client-id <id>', 'OAuth client ID')
  .option('--client-secret <secret>', 'OAuth client secret')
  .option('-s, --save <file>', 'Save configuration to file')
  .option('-i, --interactive', 'Interactive mode')
  .action(async (issuerUrl, options) => {
    const { discoverCommand } = await import('./commands/discover.js');
    await discoverCommand(issuerUrl, options);
  });

// Test discovery command
program
  .command('discover:test')
  .description('Test discovery support for common providers')
  .action(async () => {
    const { testDiscoveryCommand } = await import('./commands/discover.js');
    await testDiscoveryCommand();
  });

// Test command (comprehensive testing)
program
  .command('test <provider>')
  .description('Run comprehensive tests for a provider')
  .option('-c, --config <file>', 'Configuration file')
  .option('-g, --grants <grants>', 'Comma-separated grant types to test')
  .option('-v, --verbose', 'Verbose output')
  .option('--client-id <id>', 'OAuth client ID')
  .option('--client-secret <secret>', 'OAuth client secret')
  .action(async (provider, options) => {
    const { testCommand } = await import('./commands/test.js');
    await testCommand(provider, options);
  });

// List stored tokens
program
  .command('tokens:list')
  .alias('list-tokens')
  .description('List all stored tokens')
  .action(async () => {
    const providers = tokenManager.listProviders();

    if (providers.length === 0) {
      console.log(chalk.yellow('No stored tokens found'));
      return;
    }

    console.log(chalk.blue('Stored tokens:'));
    for (const provider of providers) {
      const token = await tokenManager.getToken(provider);
      if (token) {
        console.log(chalk.gray(`- ${provider}: ${token.access_token.substring(0, 20)}...`));
      }
    }
  });

// Clear tokens
program
  .command('tokens:clear')
  .alias('clear-tokens')
  .description('Clear all stored tokens')
  .action(async () => {
    await tokenManager.clearAll();
    console.log(chalk.green('✓ All tokens cleared'));
  });

// Remove token
program
  .command('tokens:remove <provider>')
  .description('Remove token for a specific provider')
  .action(async (provider) => {
    try {
      await tokenManager.deleteToken(provider);
      console.log(chalk.green(`✓ Token removed for provider: ${provider}`));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(chalk.red('✗ Failed to remove token:'), errorMessage);
      process.exit(1);
    }
  });

// Set log level
program
  .command('log-level <level>')
  .description('Set logging level (error, warn, info, debug)')
  .action((level) => {
    logger.level = level;
    console.log(chalk.green(`✓ Log level set to: ${level}`));
  });

// Interactive mode
program
  .command('interactive')
  .alias('i')
  .description('Start interactive mode')
  .action(async () => {
    const { interactiveCommand } = await import('./commands/interactive.js');
    await interactiveCommand();
  });

program.parse(process.argv);
