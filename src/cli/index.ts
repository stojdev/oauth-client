#!/usr/bin/env node

/* eslint-disable no-console */

import { Command } from 'commander';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { logger } from '../utils/Logger.js';
import { ClientCredentialsGrant } from '../grants/ClientCredentials.js';
import tokenManager from '../core/TokenManager.js';
import type { OAuthConfig } from '../types/index.js';

// Load environment variables
dotenv.config();

const program = new Command();

program.name('oauth-client').description('OAuth 2.0 Test Client').version('1.0.0');

// Test command for client credentials
program
  .command('test-client-credentials')
  .description('Test client credentials grant type')
  .requiredOption('-c, --client-id <id>', 'OAuth client ID')
  .requiredOption('-s, --client-secret <secret>', 'OAuth client secret')
  .requiredOption('-t, --token-url <url>', 'Token endpoint URL')
  .option('-o, --scope <scope>', 'OAuth scope')
  .action(async (options) => {
    try {
      console.log(chalk.blue('Testing Client Credentials Grant...'));

      const config: OAuthConfig = {
        clientId: options.clientId,
        clientSecret: options.clientSecret,
        tokenUrl: options.tokenUrl,
        authorizationUrl: '', // Not needed for client credentials
        scope: options.scope,
      };

      const client = new ClientCredentialsGrant(config);
      const token = await client.getAccessToken();

      console.log(chalk.green('✓ Successfully obtained access token!'));
      console.log(chalk.gray('Token Type:'), token.token_type);
      console.log(chalk.gray('Access Token:'), token.access_token.substring(0, 20) + '...');

      if (token.expires_in) {
        console.log(chalk.gray('Expires In:'), token.expires_in, 'seconds');
      }

      if (token.scope) {
        console.log(chalk.gray('Scope:'), token.scope);
      }

      // Store token
      await tokenManager.storeToken('test', token);
      console.log(chalk.green('✓ Token stored successfully'));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(chalk.red('✗ Failed to obtain token:'), errorMessage);
      if (error && typeof error === 'object' && 'description' in error) {
        console.error(
          chalk.gray('Description:'),
          String((error as Record<string, unknown>).description),
        );
      }
      process.exit(1);
    }
  });

// List stored tokens
program
  .command('list-tokens')
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
  .command('clear-tokens')
  .description('Clear all stored tokens')
  .action(async () => {
    await tokenManager.clearAll();
    console.log(chalk.green('✓ All tokens cleared'));
  });

// Set log level
program
  .command('set-log-level <level>')
  .description('Set logging level (error, warn, info, debug)')
  .action((level) => {
    logger.level = level;
    console.log(chalk.green(`✓ Log level set to: ${level}`));
  });

program.parse(process.argv);
