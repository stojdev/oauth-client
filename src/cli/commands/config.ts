import chalk from 'chalk';
import { ConfigLoader } from '../../config/ConfigLoader.js';
import { ProviderConfigManager } from '../../providers/ProviderConfig.js';
import type { ProviderConfig } from '../../config/schema.js';
import inquirer from 'inquirer';

/**
 * Initialize configuration file
 */
export async function configInitCommand(options?: {
  file?: string;
  interactive?: boolean;
}): Promise<void> {
  try {
    console.log(chalk.blue('Initializing OAuth configuration...'));

    const configLoader = new ConfigLoader();
    const providerManager = new ProviderConfigManager();

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
      console.log(chalk.yellow('Creating basic configuration...'));
      console.log(chalk.gray('Run with --interactive for guided setup'));
    }

    await configLoader.save(options?.file);
    console.log(chalk.green('✓ Configuration initialized successfully'));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red('✗ Failed to initialize configuration:'), errorMessage);
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
    console.log(chalk.blue(`Adding provider '${provider}' to configuration...`));

    const configLoader = new ConfigLoader();
    const providerManager = new ProviderConfigManager();

    await configLoader.load({ configFile: options?.file });

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

    console.log(chalk.green(`✓ Provider '${provider}' added successfully`));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red('✗ Failed to add provider:'), errorMessage);
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
      console.log(chalk.yellow('No providers configured'));
      console.log(chalk.gray('Available presets:'), providerManager.listProviderIds().join(', '));
      return;
    }

    console.log(chalk.blue('Configured providers:'));
    providers.forEach((provider) => {
      console.log(`\n${chalk.green(provider.name)} (${provider.id})`);
      console.log(chalk.gray('  Client ID:'), provider.clientId);
      console.log(chalk.gray('  Token URL:'), provider.tokenUrl);
      if (provider.authorizationUrl) {
        console.log(chalk.gray('  Auth URL:'), provider.authorizationUrl);
      }
      if (provider.scope) {
        console.log(chalk.gray('  Scope:'), provider.scope);
      }
      if (provider.supportedGrantTypes) {
        console.log(chalk.gray('  Grants:'), provider.supportedGrantTypes.join(', '));
      }
    });

    console.log(
      '\n' + chalk.gray('Available presets:'),
      providerManager.listProviderIds().join(', '),
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red('✗ Failed to list configuration:'), errorMessage);
    process.exit(1);
  }
}
