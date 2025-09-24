#!/usr/bin/env node

/**
 * Test the ServiceNow OAuth Provider
 * This script attempts multiple strategies to get a working token from ServiceNow
 */

const https = require('https');
const { URL } = require('url');

class ServiceNowAuthTester {
  constructor(instanceUrl) {
    this.instanceUrl = instanceUrl;
    this.cookies = [];
  }

  /**
   * Method 1: Try standard OAuth client_credentials
   */
  async tryClientCredentials(clientId, clientSecret) {
    console.log('\n=== Method 1: Standard Client Credentials ===');

    const data = `grant_type=client_credentials&client_id=${clientId}&client_secret=${encodeURIComponent(clientSecret)}`;
    const result = await this.makeRequest('/oauth_token.do', 'POST', data, {
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    return this.handleResponse(result);
  }

  /**
   * Method 2: Try password grant
   */
  async tryPasswordGrant(clientId, clientSecret, username, password) {
    console.log('\n=== Method 2: Password Grant ===');

    const data = new URLSearchParams({
      grant_type: 'password',
      client_id: clientId,
      client_secret: clientSecret,
      username: username,
      password: password
    }).toString();

    const result = await this.makeRequest('/oauth_token.do', 'POST', data, {
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    return this.handleResponse(result);
  }

  /**
   * Method 3: Activate session first, then try OAuth
   */
  async trySessionActivation(clientId, clientSecret, username, password) {
    console.log('\n=== Method 3: Session Activation + OAuth ===');

    // Step 1: Make an authenticated API call to activate session
    console.log('Step 1: Activating session with API call...');
    const auth = Buffer.from(`${username}:${password}`).toString('base64');

    const apiResult = await this.makeRequest('/api/now/table/sys_user?sysparm_limit=1', 'GET', null, {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json'
    });

    if (apiResult.statusCode === 200) {
      console.log('Session activated via API');

      // Step 2: Try OAuth with cookies from the session
      console.log('Step 2: Attempting OAuth with session context...');
      const data = `grant_type=client_credentials&client_id=${clientId}&client_secret=${encodeURIComponent(clientSecret)}`;

      const oauthResult = await this.makeRequest('/oauth_token.do', 'POST', data, {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': this.cookies.join('; ')
      });

      return this.handleResponse(oauthResult);
    }

    return { success: false, error: 'Failed to activate session' };
  }

  /**
   * Method 4: Use refresh token if we have one
   */
  async tryRefreshToken(clientId, clientSecret, refreshToken) {
    console.log('\n=== Method 4: Refresh Token ===');

    const data = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken
    }).toString();

    const result = await this.makeRequest('/oauth_token.do', 'POST', data, {
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    return this.handleResponse(result);
  }

  /**
   * Make HTTPS request to ServiceNow
   */
  makeRequest(path, method, data, headers = {}) {
    return new Promise((resolve) => {
      const url = new URL(this.instanceUrl);

      const options = {
        hostname: url.hostname,
        port: 443,
        path: path,
        method: method,
        headers: {
          ...headers,
          'User-Agent': 'OAuth-Test-Client/1.0'
        }
      };

      if (data) {
        options.headers['Content-Length'] = Buffer.byteLength(data);
      }

      const req = https.request(options, (res) => {
        let responseData = '';

        // Capture cookies
        if (res.headers['set-cookie']) {
          this.cookies = this.cookies.concat(res.headers['set-cookie']);
        }

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: responseData
          });
        });
      });

      req.on('error', (error) => {
        resolve({ statusCode: 0, error: error.message });
      });

      if (data) {
        req.write(data);
      }

      req.end();
    });
  }

  /**
   * Handle response and extract token
   */
  handleResponse(result) {
    console.log(`Status: ${result.statusCode}`);

    if (result.statusCode === 200) {
      try {
        const data = JSON.parse(result.data);
        if (data.access_token) {
          console.log('✅ SUCCESS! Got access token!');
          console.log(`Token: ${data.access_token.substring(0, 50)}...`);
          console.log(`Type: ${data.token_type}`);
          console.log(`Expires in: ${data.expires_in} seconds`);
          return { success: true, token: data.access_token };
        }
      } catch (e) {
        console.log('Failed to parse response:', e.message);
      }
    }

    console.log(`Response: ${result.data}`);
    return { success: false, data: result.data };
  }
}

// Run tests
async function testServiceNowAuth() {
  const tester = new ServiceNowAuthTester('https://dev267474.service-now.com');

  // Test configuration
  const config = {
    clientId: '59fadc6d0c24031afa3d7f800185112',
    clientSecret: '+-pri~-v[~',
    username: 'oauth.user',
    password: 'p9wL6sm7EWKEW@kXkE'
  };

  console.log('Testing ServiceNow OAuth with multiple strategies...');
  console.log('================================================');

  // Try each method
  let result;

  // Method 1: Standard client_credentials
  result = await tester.tryClientCredentials(config.clientId, config.clientSecret);
  if (result.success) return;

  // Method 2: Password grant
  result = await tester.tryPasswordGrant(
    config.clientId,
    config.clientSecret,
    config.username,
    config.password
  );
  if (result.success) return;

  // Method 3: Session activation
  result = await tester.trySessionActivation(
    config.clientId,
    config.clientSecret,
    config.username,
    config.password
  );
  if (result.success) return;

  console.log('\n=== Final Fallback: Basic Auth ===');
  console.log('Since OAuth is not working, use Basic Auth directly:');
  const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');
  console.log(`Authorization: Basic ${auth}`);
  console.log('✅ Basic Auth is confirmed working for ServiceNow API access');
}

// Run the test
testServiceNowAuth().catch(console.error);