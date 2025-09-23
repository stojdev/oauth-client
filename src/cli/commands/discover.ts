import chalk from 'chalk';
import { DiscoveryClient } from '../../providers/DiscoveryClient.js';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import inquirer from 'inquirer';
import type { OIDCDiscoveryDocument } from '../../providers/DiscoveryClient.js';
import { logger } from '../../utils/Logger.js';

/**
 * Discover OAuth provider configuration
 */
export async function discoverCommand(
  issuerUrl: string,
  options: {
    clientId?: string;
    clientSecret?: string;
    save?: string;
    interactive?: boolean;
  },
): Promise<void> {
  try {
    logger.info(chalk.blue(`🔍 Discovering OAuth configuration for: ${issuerUrl}`));
    logger.info('');

    // Perform discovery
    const document = await DiscoveryClient.discover(issuerUrl);

    logger.info(chalk.green('✓ Discovery successful!'));
    logger.info('');

    // Display discovered information
    logger.info(chalk.blue('Provider Information:'));
    logger.info(chalk.gray('  Issuer:'), document.issuer);
    logger.info(chalk.gray('  Authorization:'), document.authorization_endpoint);
    logger.info(chalk.gray('  Token:'), document.token_endpoint);

    if (document.userinfo_endpoint) {
      logger.info(chalk.gray('  UserInfo:'), document.userinfo_endpoint);
    }
    if (document.revocation_endpoint) {
      logger.info(chalk.gray('  Revocation:'), document.revocation_endpoint);
    }
    if (document.introspection_endpoint) {
      logger.info(chalk.gray('  Introspection:'), document.introspection_endpoint);
    }
    if (document.device_authorization_endpoint) {
      logger.info(chalk.gray('  Device Auth:'), document.device_authorization_endpoint);
    }

    logger.info('');
    logger.info(chalk.blue('Capabilities:'));

    // Grant types
    if (document.grant_types_supported) {
      logger.info(chalk.gray('  Grant Types:'));
      document.grant_types_supported.forEach((grant) => {
        logger.info(chalk.gray(`    • ${grant}`));
      });
    }

    // PKCE support
    if (document.code_challenge_methods_supported) {
      logger.info(
        chalk.gray('  PKCE Methods:'),
        document.code_challenge_methods_supported.join(', '),
      );
    }

    // Scopes
    if (document.scopes_supported) {
      logger.info(chalk.gray('  Scopes:'));
      const displayScopes = document.scopes_supported.slice(0, 10);
      displayScopes.forEach((scope) => {
        logger.info(chalk.gray(`    • ${scope}`));
      });
      if (document.scopes_supported.length > 10) {
        logger.info(chalk.gray(`    ... and ${document.scopes_supported.length - 10} more`));
      }
    }

    // Auth methods
    if (document.token_endpoint_auth_methods_supported) {
      logger.info(
        chalk.gray('  Auth Methods:'),
        document.token_endpoint_auth_methods_supported.join(', '),
      );
    }

    // Interactive mode - ask if user wants to create config
    if (options.interactive) {
      logger.info('');
      const { createConfig } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'createConfig',
          message: 'Create provider configuration from discovery?',
          default: true,
        },
      ]);

      if (createConfig) {
        await createConfigFromDiscovery(document, options);
      }
    } else if (options.save) {
      // Auto-create config if save option provided
      await createConfigFromDiscovery(document, options);
    }

    // Get provider features
    logger.info('');
    logger.info(chalk.blue('Analyzing provider features...'));
    const features = await DiscoveryClient.getProviderFeatures(issuerUrl);

    logger.info(chalk.blue('Provider Features:'));
    logger.info(
      chalk.gray('  OpenID Connect:'),
      features.supportsOIDC ? chalk.green('✓') : chalk.red('✗'),
    );
    logger.info(chalk.gray('  PKCE:'), features.supportsPKCE ? chalk.green('✓') : chalk.red('✗'));
    logger.info(
      chalk.gray('  Device Flow:'),
      features.supportsDeviceFlow ? chalk.green('✓') : chalk.red('✗'),
    );
    logger.info(
      chalk.gray('  Token Introspection:'),
      features.supportsIntrospection ? chalk.green('✓') : chalk.red('✗'),
    );
    logger.info(
      chalk.gray('  Token Revocation:'),
      features.supportsRevocation ? chalk.green('✓') : chalk.red('✗'),
    );
    logger.info(
      chalk.gray('  Refresh Tokens:'),
      features.supportsRefreshTokens ? chalk.green('✓') : chalk.red('✗'),
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(chalk.red('✗ Discovery failed:'), errorMessage);

    // Suggest alternatives
    logger.info('');
    logger.info(chalk.yellow('Tips:'));
    logger.info(chalk.gray('  • Ensure the issuer URL is correct'));
    logger.info(chalk.gray('  • Try the base domain (e.g., https://example.com)'));
    logger.info(chalk.gray('  • Check if /.well-known/openid-configuration is accessible'));
    logger.info(chalk.gray('  • Some providers may not support discovery'));

    process.exit(1);
  }
}

/**
 * Create configuration file from discovery
 */
async function createConfigFromDiscovery(
  document: unknown,
  options: {
    clientId?: string;
    clientSecret?: string;
    save?: string;
  },
): Promise<void> {
  let clientId = options.clientId;
  let clientSecret = options.clientSecret;

  // Ask for credentials if not provided
  if (!clientId) {
    const answers = await inquirer.prompt([
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
    ]);
    clientId = answers.clientId;
    clientSecret = answers.clientSecret || undefined;
  }

  // Create configuration
  const config = DiscoveryClient.createConfigFromDiscovery(
    document as unknown as OIDCDiscoveryDocument,
    clientId!,
    clientSecret,
    {
      redirectUri: 'http://localhost:8080/callback',
    },
  );

  // Determine filename
  const filename = options.save || `oauth-config-${config.id}.json`;
  const filepath = resolve(process.cwd(), filename);

  // Create config structure
  const configFile = {
    version: '1.0',
    providers: [config],
  };

  // Save to file
  writeFileSync(filepath, JSON.stringify(configFile, null, 2));

  logger.info('');
  logger.info(chalk.green(`✓ Configuration saved to: ${filepath}`));
  logger.info('');
  logger.info(chalk.blue('You can now use:'));
  logger.info(chalk.gray(`  oauth auth ${config.id} --config ${filename}`));
}

/**
 * Test discovery support for known providers
 */
export async function testDiscoveryCommand(): Promise<void> {
  const providers = [
    { name: 'Google', url: 'https://accounts.google.com' },
    { name: 'Microsoft', url: 'https://login.microsoftonline.com/common' },
    { name: 'Okta (example)', url: 'https://dev-12345.okta.com' },
    { name: 'Auth0 (example)', url: 'https://example.auth0.com' },
    { name: 'Keycloak (example)', url: 'https://keycloak.example.com/realms/master' },
  ];

  logger.info(chalk.blue('Testing discovery support for common providers:'));
  logger.info('');

  for (const provider of providers) {
    process.stdout.write(chalk.gray(`${provider.name.padEnd(20)} `));

    try {
      const supports = await DiscoveryClient.supportsDiscovery(provider.url);
      if (supports) {
        logger.info(chalk.green('✓ Supports discovery'));
      } else {
        logger.info(chalk.yellow('⚠ No discovery endpoint found'));
      }
    } catch {
      logger.info(chalk.red('✗ Failed to check'));
    }
  }

  logger.info('');
  logger.info(chalk.gray('Note: Some URLs are examples and may not be accessible'));
}
