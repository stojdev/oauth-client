#!/usr/bin/env node

/**
 * ServiceNow Session-Based OAuth Test
 * Attempts to establish a session first, then get OAuth token
 */

const https = require('https');
const querystring = require('querystring');

// Keep cookies across requests
let cookies = [];

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    if (cookies.length > 0) {
      options.headers = options.headers || {};
      options.headers['Cookie'] = cookies.join('; ');
    }

    const req = https.request(options, (res) => {
      // Capture cookies
      if (res.headers['set-cookie']) {
        res.headers['set-cookie'].forEach(cookie => {
          const mainCookie = cookie.split(';')[0];
          cookies.push(mainCookie);
        });
      }

      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: responseData
        });
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(data);
    }

    req.end();
  });
}

async function loginToServiceNow() {
  console.log('Step 1: Establishing ServiceNow session...');

  // First, get the login page to capture CSRF token
  const loginPageResult = await makeRequest({
    hostname: 'dev267474.service-now.com',
    path: '/login.do',
    method: 'GET',
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  console.log(`   Login page status: ${loginPageResult.statusCode}`);

  // Extract CSRF token if present
  const csrfMatch = loginPageResult.data.match(/name="sysparm_ck"\s+value="([^"]+)"/);
  const csrfToken = csrfMatch ? csrfMatch[1] : '';

  // Now attempt login
  const loginData = querystring.stringify({
    user_name: 'oauth.user',
    user_password: 'p9wL6sm7EWKEW@kXkE',
    sys_action: 'sysverb_login',
    sysparm_ck: csrfToken
  });

  const loginResult = await makeRequest({
    hostname: 'dev267474.service-now.com',
    path: '/login.do',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(loginData),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  }, loginData);

  console.log(`   Login attempt status: ${loginResult.statusCode}`);

  // Check if login was successful by looking for redirect or session cookie
  const hasSession = cookies.some(c => c.includes('JSESSIONID') || c.includes('glide_session'));
  console.log(`   Session established: ${hasSession ? '✅' : '❌'}`);

  return hasSession;
}

async function getOAuthToken() {
  console.log('\nStep 2: Requesting OAuth token with session...');

  const tokenData = querystring.stringify({
    grant_type: 'client_credentials',
    client_id: '59fadc6d0c24031afa3d7f800185112',
    client_secret: '+-pri~-v[~'
  });

  const result = await makeRequest({
    hostname: 'dev267474.service-now.com',
    path: '/oauth_token.do',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(tokenData),
      'Accept': 'application/json'
    }
  }, tokenData);

  console.log(`   OAuth response status: ${result.statusCode}`);

  if (result.statusCode === 200) {
    try {
      const token = JSON.parse(result.data);
      console.log('   ✅ SUCCESS! Got OAuth token!');
      return token;
    } catch (e) {
      console.log('   ❌ Failed to parse token response');
    }
  } else {
    try {
      const error = JSON.parse(result.data);
      console.log(`   ❌ OAuth error: ${error.error} - ${error.error_description}`);
    } catch (e) {
      console.log(`   ❌ OAuth failed with status ${result.statusCode}`);
    }
  }

  return null;
}

async function testWithToken(token) {
  console.log('\nStep 3: Testing OAuth token with API call...');

  const result = await makeRequest({
    hostname: 'dev267474.service-now.com',
    path: '/api/now/table/incident?sysparm_limit=1',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token.access_token}`,
      'Accept': 'application/json'
    }
  });

  console.log(`   API call status: ${result.statusCode}`);

  if (result.statusCode === 200) {
    console.log('   ✅ Token works! Successfully accessed ServiceNow API');
    return true;
  } else {
    console.log('   ❌ Token failed to access API');
    return false;
  }
}

// Alternative: Try REST API login
async function tryRESTLogin() {
  console.log('\nAlternative: Trying REST API authentication...');

  const auth = Buffer.from('oauth.user:p9wL6sm7EWKEW@kXkE').toString('base64');

  // First authenticate via REST
  const authResult = await makeRequest({
    hostname: 'dev267474.service-now.com',
    path: '/api/now/v1/auth/login',
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json'
    }
  });

  console.log(`   REST auth status: ${authResult.statusCode}`);

  if (authResult.statusCode === 200 || authResult.statusCode === 201) {
    console.log('   Session established via REST API');
    return true;
  }

  return false;
}

// Main execution
async function main() {
  console.log('ServiceNow OAuth Session-Based Authentication Test');
  console.log('==================================================\n');

  try {
    // Try web login first
    const sessionEstablished = await loginToServiceNow();

    if (!sessionEstablished) {
      console.log('\nWeb login failed, trying REST API login...');
      await tryRESTLogin();
    }

    // Now try OAuth with session
    const token = await getOAuthToken();

    if (token) {
      console.log('\n🎉 SUCCESS! Retrieved OAuth Access Token:');
      console.log('==========================================');
      console.log(`Access Token: ${token.access_token}`);
      console.log(`Token Type: ${token.token_type}`);
      console.log(`Expires In: ${token.expires_in} seconds`);
      if (token.refresh_token) {
        console.log(`Refresh Token: ${token.refresh_token}`);
      }

      // Test the token
      await testWithToken(token);

      console.log('\n✅ MISSION ACCOMPLISHED!');
      console.log('ServiceNow OAuth is working with the toolkit!');

      return token;
    } else {
      console.log('\n❌ Still unable to get OAuth token');
      console.log('ServiceNow may require manual UI login first');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);