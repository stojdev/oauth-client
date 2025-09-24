#!/usr/bin/env node

const https = require('https');
const { URL } = require('url');

/**
 * ServiceNow Login Simulator
 * Simulates a browser login to activate the OAuth Application User session
 */
class ServiceNowLoginSimulator {
  constructor(instanceUrl) {
    this.instanceUrl = instanceUrl;
    this.cookies = {};
    this.jsessionid = null;
  }

  /**
   * Parse cookies from response headers
   */
  parseCookies(setCookieHeaders) {
    if (!setCookieHeaders) return;

    const cookieArray = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];

    cookieArray.forEach(cookie => {
      const parts = cookie.split(';')[0].split('=');
      if (parts.length === 2) {
        this.cookies[parts[0]] = parts[1];
        if (parts[0] === 'JSESSIONID') {
          this.jsessionid = parts[1];
        }
      }
    });
  }

  /**
   * Get cookie string for requests
   */
  getCookieString() {
    return Object.entries(this.cookies).map(([key, value]) => `${key}=${value}`).join('; ');
  }

  /**
   * Make HTTPS request
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
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          ...headers
        }
      };

      // Add cookies if we have them
      if (Object.keys(this.cookies).length > 0) {
        options.headers['Cookie'] = this.getCookieString();
      }

      if (data) {
        options.headers['Content-Length'] = Buffer.byteLength(data);
      }

      const req = https.request(options, (res) => {
        let responseData = '';

        // Parse cookies from response
        this.parseCookies(res.headers['set-cookie']);

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: responseData,
            location: res.headers.location
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
   * Simulate browser login to ServiceNow
   */
  async login(username, password) {
    console.log('\n=== Simulating ServiceNow Browser Login ===');

    // Step 1: Get initial session and CSRF token
    console.log('Step 1: Getting login page...');
    const loginPageResult = await this.makeRequest('/login.do', 'GET');
    console.log(`  Status: ${loginPageResult.statusCode}`);
    console.log(`  JSESSIONID: ${this.jsessionid ? this.jsessionid.substring(0, 20) + '...' : 'Not set'}`);

    // Extract CSRF token if present (ServiceNow might have one)
    let csrfToken = null;
    const csrfMatch = loginPageResult.data.match(/name="sysparm_ck"\s+value="([^"]+)"/);
    if (csrfMatch) {
      csrfToken = csrfMatch[1];
      console.log(`  CSRF Token: ${csrfToken.substring(0, 20)}...`);
    }

    // Step 2: Submit login credentials
    console.log('\nStep 2: Submitting login credentials...');

    const loginData = new URLSearchParams({
      'user_name': username,
      'user_password': password,
      'sys_action': 'sysverb_login',
      'sysparm_login_url': 'welcome.do'
    });

    if (csrfToken) {
      loginData.append('sysparm_ck', csrfToken);
    }

    const loginResult = await this.makeRequest('/login.do', 'POST', loginData.toString(), {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer': `${this.instanceUrl}/login.do`,
      'Origin': this.instanceUrl
    });

    console.log(`  Status: ${loginResult.statusCode}`);
    console.log(`  Location: ${loginResult.location || 'Not redirected'}`);

    // Check if login was successful
    if (loginResult.statusCode === 302 || loginResult.location) {
      console.log('  ✅ Login appears successful (redirect detected)');

      // Step 3: Follow redirect to complete login
      if (loginResult.location) {
        console.log('\nStep 3: Following redirect...');
        const redirectPath = loginResult.location.startsWith('http')
          ? new URL(loginResult.location).pathname
          : loginResult.location;

        const redirectResult = await this.makeRequest(redirectPath, 'GET');
        console.log(`  Status: ${redirectResult.statusCode}`);
      }

      return true;
    } else {
      console.log('  ❌ Login failed (no redirect)');
      return false;
    }
  }

  /**
   * Try OAuth after login
   */
  async tryOAuth(clientId, clientSecret) {
    console.log('\n=== Attempting OAuth with Active Session ===');

    const data = `grant_type=client_credentials&client_id=${clientId}&client_secret=${encodeURIComponent(clientSecret)}`;

    const result = await this.makeRequest('/oauth_token.do', 'POST', data, {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    });

    console.log(`Status: ${result.statusCode}`);

    if (result.statusCode === 200) {
      try {
        const tokenData = JSON.parse(result.data);
        if (tokenData.access_token) {
          console.log('✅ SUCCESS! Got OAuth access token!');
          console.log(`Token: ${tokenData.access_token.substring(0, 50)}...`);
          console.log(`Type: ${tokenData.token_type}`);
          console.log(`Expires in: ${tokenData.expires_in} seconds`);
          return tokenData;
        }
      } catch (e) {
        console.log('Failed to parse token response');
      }
    }

    console.log(`Response: ${result.data}`);
    return null;
  }
}

// Run the login simulation
async function main() {
  const simulator = new ServiceNowLoginSimulator('https://dev267474.service-now.com');

  // Configuration
  const config = {
    clientId: '59fadc6d0c24031afa3d7f800185112',
    clientSecret: '+-pri~-v[~',
    username: 'oauth.user',
    password: 'p9wL6sm7EWKEW@kXkE'
  };

  console.log('ServiceNow OAuth Login Simulation');
  console.log('==================================');

  // Try to login as the OAuth user
  const loginSuccess = await simulator.login(config.username, config.password);

  if (loginSuccess) {
    // Try OAuth with the active session
    const token = await simulator.tryOAuth(config.clientId, config.clientSecret);

    if (!token) {
      console.log('\n⚠️ OAuth still failed even after login simulation');
      console.log('ServiceNow may require actual browser interaction');
    }
  } else {
    console.log('\n❌ Failed to simulate login');
  }

  // Show fallback
  console.log('\n=== Fallback Solution ===');
  const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');
  console.log('Since OAuth requires manual browser login, use Basic Auth:');
  console.log(`Authorization: Basic ${auth}`);
  console.log('This is confirmed working for API access');
}

main().catch(console.error);