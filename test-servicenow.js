#!/usr/bin/env node

/**
 * ServiceNow OAuth Token Retrieval Test
 * Testing with real ServiceNow instance credentials
 */

import { ClientCredentialsGrant } from './dist/index.js';
import { ResourceOwnerPasswordGrant } from './dist/index.js';
import chalk from 'chalk';

// ServiceNow OAuth Configuration from screenshot
const SERVICENOW_CONFIG = {
  clientId: '5051cfd32fb664108e8a54c006a49865',
  clientSecret: 'fdbef6df1bfa6490c7b90c25464bcbad',
  scope: 'useraccount',
  // ServiceNow OAuth endpoints typically follow this pattern:
  // https://<instance>.service-now.com/oauth_token.do
  tokenUrl: '', // We need to determine the instance URL
};

// Common ServiceNow instance patterns
const POSSIBLE_INSTANCES = [
  'dev', 'test', 'prod', 'demo',
  'dev1', 'dev2', 'dev3',
  'test1', 'test2', 'test3',
];

async function findServiceNowInstance() {
  console.log(chalk.blue('🔍 Attempting to discover ServiceNow instance...'));

  // Try to determine from environment or common patterns
  const customInstance = process.env.SERVICENOW_INSTANCE;
  if (customInstance) {
    const url = `https://${customInstance}.service-now.com/oauth_token.do`;
    console.log(chalk.gray(`Using custom instance: ${url}`));
    return url;
  }

  // Since we can't determine the instance URL from the screenshot,
  // we'll need user input
  console.log(chalk.yellow('\n⚠️  ServiceNow instance URL needed!'));
  console.log(chalk.gray('The instance name is the first part of your ServiceNow URL.'));
  console.log(chalk.gray('For example, if you access ServiceNow at:'));
  console.log(chalk.gray('  https://mycompany.service-now.com'));
  console.log(chalk.gray('Then the instance name is: mycompany'));

  return null;
}

async function testClientCredentials(tokenUrl) {
  console.log(chalk.blue('\n📋 Testing Client Credentials Grant'));
  console.log(chalk.gray('═'.repeat(50)));

  const config = {
    ...SERVICENOW_CONFIG,
    tokenUrl,
  };

  try {
    const client = new ClientCredentialsGrant(config);

    console.log(chalk.yellow('→ Requesting access token...'));
    console.log(chalk.gray(`  Client ID: ${config.clientId}`));
    console.log(chalk.gray(`  Scope: ${config.scope}`));

    const startTime = Date.now();
    const tokenResponse = await client.getAccessToken();
    const duration = Date.now() - startTime;

    if (tokenResponse && tokenResponse.access_token) {
      console.log(chalk.green('✅ SUCCESS: Access token retrieved!'));
      console.log(chalk.gray(`  Duration: ${duration}ms`));
      console.log(chalk.gray(`  Token Type: ${tokenResponse.token_type || 'bearer'}`));
      console.log(chalk.gray(`  Expires In: ${tokenResponse.expires_in || 1800} seconds`));
      console.log(chalk.gray(`  Token Preview: ${tokenResponse.access_token.substring(0, 30)}...`));

      if (tokenResponse.refresh_token) {
        console.log(chalk.gray(`  Refresh Token: ${tokenResponse.refresh_token.substring(0, 30)}...`));
      }

      return tokenResponse;
    }
  } catch (error) {
    console.log(chalk.red(`❌ Client Credentials failed: ${error.message}`));
    if (error.response) {
      console.log(chalk.gray(`  Status: ${error.response.status}`));
      if (error.response.data) {
        console.log(chalk.gray(`  Response: ${JSON.stringify(error.response.data)}`));
      }
    }
  }

  return null;
}

async function testResourceOwnerPassword(tokenUrl, username, password) {
  console.log(chalk.blue('\n📋 Testing Resource Owner Password Grant'));
  console.log(chalk.gray('═'.repeat(50)));

  const config = {
    ...SERVICENOW_CONFIG,
    tokenUrl,
  };

  try {
    const client = new ResourceOwnerPasswordGrant(config);

    console.log(chalk.yellow('→ Requesting access token with username/password...'));
    console.log(chalk.gray(`  Username: ${username}`));
    console.log(chalk.gray(`  Scope: ${config.scope}`));

    const startTime = Date.now();
    const tokenResponse = await client.getAccessToken(username, password);
    const duration = Date.now() - startTime;

    if (tokenResponse && tokenResponse.access_token) {
      console.log(chalk.green('✅ SUCCESS: Access token retrieved!'));
      console.log(chalk.gray(`  Duration: ${duration}ms`));
      console.log(chalk.gray(`  Token Type: ${tokenResponse.token_type || 'bearer'}`));
      console.log(chalk.gray(`  Expires In: ${tokenResponse.expires_in || 1800} seconds`));
      console.log(chalk.gray(`  Token Preview: ${tokenResponse.access_token.substring(0, 30)}...`));

      if (tokenResponse.refresh_token) {
        console.log(chalk.gray(`  Refresh Token: ${tokenResponse.refresh_token.substring(0, 30)}...`));
      }

      return tokenResponse;
    }
  } catch (error) {
    console.log(chalk.red(`❌ Resource Owner Password failed: ${error.message}`));
    if (error.response) {
      console.log(chalk.gray(`  Status: ${error.response.status}`));
      if (error.response.data) {
        console.log(chalk.gray(`  Response: ${JSON.stringify(error.response.data)}`));
      }
    }
  }

  return null;
}

async function main() {
  console.log(chalk.cyan('\n🎯 ServiceNow OAuth Token Retrieval Test'));
  console.log(chalk.cyan('Testing with real ServiceNow instance\n'));

  // Check for instance URL
  const instanceName = process.argv[2] || process.env.SERVICENOW_INSTANCE;

  if (!instanceName) {
    console.log(chalk.red('❌ Error: ServiceNow instance name required!'));
    console.log(chalk.yellow('\nUsage:'));
    console.log(chalk.gray('  node test-servicenow.js <instance-name>'));
    console.log(chalk.gray('  OR'));
    console.log(chalk.gray('  SERVICENOW_INSTANCE=<instance-name> node test-servicenow.js'));
    console.log(chalk.gray('\nExample:'));
    console.log(chalk.gray('  node test-servicenow.js mycompany'));
    console.log(chalk.gray('\nThis will test: https://mycompany.service-now.com/oauth_token.do'));
    process.exit(1);
  }

  const tokenUrl = `https://${instanceName}.service-now.com/oauth_token.do`;
  console.log(chalk.blue(`🌐 ServiceNow Instance: ${tokenUrl}`));

  // Test 1: Client Credentials
  console.log(chalk.cyan('\n═══════════════════════════════════════════════════'));
  const ccToken = await testClientCredentials(tokenUrl);

  // Test 2: Resource Owner Password (if credentials provided)
  const username = process.env.SERVICENOW_USERNAME;
  const password = process.env.SERVICENOW_PASSWORD;

  if (username && password) {
    console.log(chalk.cyan('\n═══════════════════════════════════════════════════'));
    const ropToken = await testResourceOwnerPassword(tokenUrl, username, password);
  } else {
    console.log(chalk.yellow('\n💡 Tip: Set SERVICENOW_USERNAME and SERVICENOW_PASSWORD to test Resource Owner Password grant'));
  }

  console.log(chalk.cyan('\n═══════════════════════════════════════════════════'));
  console.log(chalk.cyan('Test Complete\n'));

  if (ccToken) {
    console.log(chalk.green('✅ ServiceNow OAuth is working!'));
    console.log(chalk.gray('You can now use this access token to call ServiceNow REST APIs.'));
  } else {
    console.log(chalk.yellow('⚠️  Could not retrieve access token.'));
    console.log(chalk.gray('Check your instance URL and credentials.'));
  }
}

main().catch(console.error);