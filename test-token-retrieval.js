#!/usr/bin/env node

/**
 * Simple test script to verify OAuth 2.0 token retrieval
 * This demonstrates the core purpose: testing Access Token retrieval from OAuth providers
 */

import { ClientCredentialsGrant } from './dist/index.js';
import chalk from 'chalk';

// Test configuration - replace with your actual credentials
const testProviders = [
  {
    name: 'Mock Provider (for testing)',
    config: {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      tokenUrl: 'https://httpbin.org/post', // Mock endpoint for testing
      scope: 'read write',
    },
  },
  // Uncomment and configure to test with real providers:
  // {
  //   name: 'Google',
  //   config: {
  //     clientId: process.env.GOOGLE_CLIENT_ID,
  //     clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  //     tokenUrl: 'https://oauth2.googleapis.com/token',
  //     scope: 'https://www.googleapis.com/auth/userinfo.profile',
  //   },
  // },
  // {
  //   name: 'GitHub',
  //   config: {
  //     clientId: process.env.GITHUB_CLIENT_ID,
  //     clientSecret: process.env.GITHUB_CLIENT_SECRET,
  //     tokenUrl: 'https://github.com/login/oauth/access_token',
  //     scope: 'read:user',
  //   },
  // },
];

async function testTokenRetrieval(provider) {
  console.log(chalk.blue(`\n🧪 Testing: ${provider.name}`));
  console.log(chalk.gray('═'.repeat(50)));

  try {
    // This is the core functionality - retrieving an access token
    const client = new ClientCredentialsGrant(provider.config);

    console.log(chalk.yellow('→ Requesting access token...'));
    const startTime = Date.now();

    const tokenResponse = await client.getAccessToken();

    const duration = Date.now() - startTime;

    // Verify we got a token response
    if (tokenResponse && tokenResponse.access_token) {
      console.log(chalk.green('✅ SUCCESS: Token retrieved'));
      console.log(chalk.gray(`   Duration: ${duration}ms`));
      console.log(chalk.gray(`   Token Type: ${tokenResponse.token_type || 'bearer'}`));
      console.log(chalk.gray(`   Expires In: ${tokenResponse.expires_in || 'N/A'} seconds`));
      console.log(chalk.gray(`   Token Preview: ${tokenResponse.access_token.substring(0, 20)}...`));
      return true;
    } else {
      console.log(chalk.red('❌ FAIL: No access token in response'));
      return false;
    }
  } catch (error) {
    console.log(chalk.red(`❌ ERROR: ${error.message}`));
    if (error.response) {
      console.log(chalk.gray(`   Status: ${error.response.status}`));
      console.log(chalk.gray(`   Response: ${JSON.stringify(error.response.data).substring(0, 100)}...`));
    }
    return false;
  }
}

async function runTests() {
  console.log(chalk.cyan('\n📋 OAuth 2.0 Token Retrieval Test Suite'));
  console.log(chalk.cyan('Purpose: Verify Access Token retrieval from OAuth providers\n'));

  let passed = 0;
  let failed = 0;

  for (const provider of testProviders) {
    if (provider.config.clientId && provider.config.clientSecret) {
      const success = await testTokenRetrieval(provider);
      if (success) passed++;
      else failed++;
    } else {
      console.log(chalk.yellow(`\n⚠️  Skipping ${provider.name}: Missing credentials`));
    }
  }

  console.log(chalk.cyan('\n═══════════════════════════════════════════════════'));
  console.log(chalk.cyan('Test Results:'));
  console.log(chalk.green(`  ✅ Passed: ${passed}`));
  console.log(chalk.red(`  ❌ Failed: ${failed}`));
  console.log(chalk.cyan('═══════════════════════════════════════════════════\n'));
}

// Run the tests
runTests().catch(console.error);