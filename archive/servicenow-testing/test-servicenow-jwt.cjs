#!/usr/bin/env node

/**
 * ServiceNow JWT/Session Token Approach
 * Try to get a session token first, then use it for OAuth
 */

const https = require('https');
const crypto = require('crypto');

async function makeRequest(options, data = null, cookies = []) {
  return new Promise((resolve, reject) => {
    if (cookies.length > 0) {
      options.headers = options.headers || {};
      options.headers['Cookie'] = cookies.join('; ');
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      const newCookies = [];

      if (res.headers['set-cookie']) {
        res.headers['set-cookie'].forEach(cookie => {
          newCookies.push(cookie.split(';')[0]);
        });
      }

      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: responseData,
          cookies: newCookies
        });
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function tryAlternativeAuth() {
  console.log('ServiceNow OAuth - Alternative Authentication Methods');
  console.log('=====================================================\n');

  const auth = Buffer.from('oauth.user:p9wL6sm7EWKEW@kXkE').toString('base64');

  // Method 1: Try to get session token via REST API
  console.log('Method 1: REST API Session Token');
  console.log('---------------------------------');

  let result = await makeRequest({
    hostname: 'dev267474.service-now.com',
    path: '/api/now/v2/auth/login',
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json'
    }
  });

  console.log(`Status: ${result.statusCode}`);
  if (result.data) {
    try {
      const parsed = JSON.parse(result.data);
      console.log('Response:', JSON.stringify(parsed, null, 2).substring(0, 200));
    } catch (e) {
      console.log('Response:', result.data.substring(0, 200));
    }
  }

  // Method 2: Try OAuth with user context
  console.log('\n\nMethod 2: OAuth Password Grant with User Context');
  console.log('------------------------------------------------');

  const passwordGrantData = new URLSearchParams({
    grant_type: 'password',
    client_id: '59fadc6d0c24031afa3d7f800185112',
    client_secret: '+-pri~-v[~',
    username: 'oauth.user',
    password: 'p9wL6sm7EWKEW@kXkE',
    scope: 'useraccount'
  }).toString();

  result = await makeRequest({
    hostname: 'dev267474.service-now.com',
    path: '/oauth_token.do',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(passwordGrantData),
      'Accept': 'application/json'
    }
  }, passwordGrantData);

  console.log(`Status: ${result.statusCode}`);
  if (result.statusCode === 200) {
    const token = JSON.parse(result.data);
    console.log('✅ SUCCESS! Got OAuth token via password grant!');
    console.log(`Token: ${token.access_token}`);
    return token;
  } else {
    try {
      const error = JSON.parse(result.data);
      console.log(`Error: ${error.error} - ${error.error_description}`);
    } catch (e) {
      console.log('Response:', result.data);
    }
  }

  // Method 3: Try JWT assertion grant
  console.log('\n\nMethod 3: JWT Assertion Grant');
  console.log('-----------------------------');

  // Create a JWT for ServiceNow
  const header = Buffer.from(JSON.stringify({
    alg: 'HS256',
    typ: 'JWT'
  })).toString('base64url');

  const payload = Buffer.from(JSON.stringify({
    iss: '59fadc6d0c24031afa3d7f800185112',
    sub: 'oauth.user',
    aud: 'https://dev267474.service-now.com',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000)
  })).toString('base64url');

  const signature = crypto
    .createHmac('sha256', '+-pri~-v[~')
    .update(`${header}.${payload}`)
    .digest('base64url');

  const jwt = `${header}.${payload}.${signature}`;

  const jwtGrantData = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt
  }).toString();

  result = await makeRequest({
    hostname: 'dev267474.service-now.com',
    path: '/oauth_token.do',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(jwtGrantData),
      'Accept': 'application/json'
    }
  }, jwtGrantData);

  console.log(`Status: ${result.statusCode}`);
  if (result.statusCode === 200) {
    const token = JSON.parse(result.data);
    console.log('✅ SUCCESS! Got OAuth token via JWT assertion!');
    console.log(`Token: ${token.access_token}`);
    return token;
  } else {
    try {
      const error = JSON.parse(result.data);
      console.log(`Error: ${error.error} - ${error.error_description || error.error}`);
    } catch (e) {
      console.log('Response:', result.data);
    }
  }

  // Method 4: Try authorization code flow simulation
  console.log('\n\nMethod 4: Direct Token Request with Session');
  console.log('-------------------------------------------');

  // First establish a session
  const loginData = `user_name=oauth.user&user_password=p9wL6sm7EWKEW@kXkE&sys_action=sysverb_login`;

  const loginResult = await makeRequest({
    hostname: 'dev267474.service-now.com',
    path: '/login.do',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(loginData)
    }
  }, loginData);

  const sessionCookies = loginResult.cookies;
  console.log(`Session cookies obtained: ${sessionCookies.length > 0 ? '✅' : '❌'}`);

  // Now try OAuth with session
  const sessionTokenData = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: '59fadc6d0c24031afa3d7f800185112',
    client_secret: '+-pri~-v[~'
  }).toString();

  result = await makeRequest({
    hostname: 'dev267474.service-now.com',
    path: '/oauth_token.do',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(sessionTokenData),
      'Accept': 'application/json'
    }
  }, sessionTokenData, sessionCookies);

  console.log(`OAuth with session - Status: ${result.statusCode}`);
  if (result.statusCode === 200) {
    const token = JSON.parse(result.data);
    console.log('✅ SUCCESS! Got OAuth token with session!');
    console.log(`Token: ${token.access_token}`);
    return token;
  } else {
    try {
      const error = JSON.parse(result.data);
      console.log(`Error: ${error.error} - ${error.error_description}`);
    } catch (e) {
      console.log('Response:', result.data);
    }
  }

  return null;
}

tryAlternativeAuth().then(token => {
  if (token) {
    console.log('\n\n🎉 FINAL SUCCESS!');
    console.log('================');
    console.log('OAuth Access Token:', token.access_token);
    console.log('\nThe OAuth toolkit CAN work with ServiceNow!');
  } else {
    console.log('\n\nAll alternative methods failed.');
    console.log('ServiceNow requires the OAuth Application User to log in via the web UI first.');
    console.log('\nNext step: Manually log into https://dev267474.service-now.com as oauth.user');
  }
}).catch(console.error);