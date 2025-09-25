import chalk from 'chalk';
import { ConfigLoader } from '../../config/ConfigLoader.js';
import { ProviderConfigManager } from '../../providers/ProviderConfig.js';
import type { ProviderConfig } from '../../config/schema.js';
import inquirer from 'inquirer';
import { logger } from '../../utils/Logger.js';

/**
 * Initialize configuration file
 */
export async function configInitCommand(options?: {
  file?: string;
  interactive?: boolean;
}): Promise<void> {
  try {
    logger.info(chalk.blue('Initializing OAuth configuration...'));

    const configLoader = new ConfigLoader();
    const providerManager = new ProviderConfigManager();

    // Load default configuration
    await configLoader.load({ configFile: options?.file, skipValidation: true });

    if (options?.interactive) {
      // Interactive mode
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'provider',
          message: 'Select a provider:',
          choices: providerManager.listProviderIds(),
        },
        {
          type: 'input',
          name: 'clientId',
          message: 'Enter Client ID:',
          validate: (input) => input.length > 0 || 'Client ID is required',
        },
        {
          type: 'password',
          name: 'clientSecret',
          message: 'Enter Client Secret (optional):',
          mask: '*',
        },
        {
          type: 'input',
          name: 'redirectUri',
          message: 'Enter Redirect URI:',
          default: 'http://localhost:8080/callback',
        },
      ]);

      const config = providerManager.createFromPreset(answers.provider, {
        clientId: answers.clientId,
        clientSecret: answers.clientSecret || undefined,
        redirectUri: answers.redirectUri,
      });

      configLoader.addProvider(config);
    } else {
      // Create basic configuration
      logger.info(chalk.yellow('Creating basic configuration...'));
      logger.info(chalk.gray('Run with --interactive for guided setup'));
    }

    await configLoader.save(options?.file);
    logger.info(chalk.green('✓ Configuration initialized successfully'));
    process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`${chalk.red('✗ Failed to initialize configuration:')} ${errorMessage}`);
    process.exit(1);
  }
}

/**
 * Add provider to configuration
 */
export async function configAddCommand(
  provider: string,
  options?: {
    file?: string;
    clientId?: string;
    clientSecret?: string;
    tokenUrl?: string;
    authorizationUrl?: string;
    interactive?: boolean;
  },
): Promise<void> {
  try {
    logger.info(chalk.blue(`Adding provider '${provider}' to configuration...`));

    const configLoader = new ConfigLoader();
    const providerManager = new ProviderConfigManager();

    await configLoader.load({ configFile: options?.file, skipValidation: true });

    let config: ProviderConfig;

    if (options?.interactive) {
      // Interactive mode
      const preset = providerManager.getPreset(provider);
      const isPreset = !!preset;

      const questions: unknown[] = [
        {
          type: 'input',
          name: 'clientId',
          message: 'Enter Client ID:',
          default: options?.clientId,
          validate: (input: string) => (input.length > 0 ? true : 'Client ID is required'),
        },
        {
          type: 'password',
          name: 'clientSecret',
          message: 'Enter Client Secret:',
          default: options?.clientSecret,
          mask: '*',
        },
      ];

      if (!isPreset) {
        questions.push(
          {
            type: 'input',
            name: 'tokenUrl',
            message: 'Enter Token URL:',
            default: options?.tokenUrl,
            validate: (input: string) => (input.length > 0 ? true : 'Token URL is required'),
          },
          {
            type: 'input',
            name: 'authorizationUrl',
            message: 'Enter Authorization URL (optional):',
            default: options?.authorizationUrl,
          },
        );
      }

      const answers = (await inquirer.prompt(
        questions as unknown as Parameters<typeof inquirer.prompt>[0],
      )) as Record<string, string>;

      if (isPreset) {
        config = providerManager.createFromPreset(provider, {
          clientId: answers.clientId,
          clientSecret: answers.clientSecret,
        });
      } else {
        config = {
          id: provider,
          name: provider,
          clientId: answers.clientId,
          clientSecret: answers.clientSecret,
          tokenUrl: answers.tokenUrl,
          authorizationUrl: answers.authorizationUrl,
        };
      }
    } else {
      // Try to use preset
      const preset = providerManager.getPreset(provider);
      if (preset && options?.clientId) {
        config = providerManager.createFromPreset(provider, {
          clientId: options.clientId,
          clientSecret: options.clientSecret,
          redirectUri: 'http://localhost:8080/callback',
        });
      } else if (options?.clientId && options?.tokenUrl) {
        config = {
          id: provider,
          name: provider,
          clientId: options.clientId,
          clientSecret: options.clientSecret,
          tokenUrl: options.tokenUrl,
          authorizationUrl: options.authorizationUrl,
        };
      } else {
        throw new Error('Client ID and token URL are required (or use --interactive)');
      }
    }

    configLoader.addProvider(config);
    await configLoader.save(options?.file);

    logger.info(chalk.green(`✓ Provider '${provider}' added successfully`));
    process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`${chalk.red('✗ Failed to add provider:')} ${errorMessage}`);
    process.exit(1);
  }
}

/**
 * List configured providers
 */
export async function configListCommand(options?: { file?: string }): Promise<void> {
  try {
    const configLoader = new ConfigLoader();
    await configLoader.load({ configFile: options?.file });

    const providers = configLoader.getAllProviders();
    const providerManager = new ProviderConfigManager();

    if (providers.length === 0) {
      logger.info(chalk.yellow('No providers configured'));
      logger.info(
        `${chalk.gray('Available presets:')} ${providerManager.listProviderIds().join(', ')}`,
      );
      process.exit(0);
    }

    logger.info(chalk.blue('Configured providers:'));
    providers.forEach((provider) => {
      logger.info(`\n${chalk.green(provider.name)} (${provider.id})`);
      logger.info(`${chalk.gray('  Client ID:')} ${provider.clientId}`);
      logger.info(`${chalk.gray('  Token URL:')} ${provider.tokenUrl}`);
      if (provider.authorizationUrl) {
        logger.info(`${chalk.gray('  Auth URL:')} ${provider.authorizationUrl}`);
      }
      if (provider.scope) {
        logger.info(`${chalk.gray('  Scope:')} ${provider.scope}`);
      }
      if (provider.supportedGrantTypes) {
        logger.info(`${chalk.gray('  Grants:')} ${provider.supportedGrantTypes.join(', ')}`);
      }
    });

    logger.info(
      `\n${chalk.gray('Available presets:')} ${providerManager.listProviderIds().join(', ')}`,
    );
    process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`${chalk.red('✗ Failed to list configuration:')} ${errorMessage}`);
    process.exit(1);
  }
}
