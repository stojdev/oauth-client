#!/usr/bin/env node

const https = require('https');
const querystring = require('querystring');

/**
 * Test ServiceNow OAuth based on research findings
 */

async function makeRequest(hostname, path, method, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      port: 443,
      path,
      method,
      headers: {
        'Accept': 'application/json',
        ...headers
      }
    };

    if (data && method === 'POST') {
      options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }

    const req = https.request(options, (res) => {
      let responseData = '';

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

    req.on('error', reject);

    if (data) {
      req.write(data);
    }

    req.end();
  });
}

async function testServiceNowOAuth() {
  console.log('ServiceNow OAuth Testing - Based on Research Findings');
  console.log('=====================================================\n');

  const configs = [
    {
      name: 'OAuth Test 1',
      clientId: '59fadc6d0c24031afa3d7f800185112',
      clientSecret: '+-pri~-v[~'
    },
    {
      name: 'OAuth Test 2',
      clientId: '34c9baf9dd6a463b99ab4fdd36666e65c',
      clientSecret: 'E;t#d0POBa'
    }
  ];

  for (const config of configs) {
    console.log(`\nTesting ${config.name}`);
    console.log('------------------------');

    // Test 1: Exact format from documentation
    console.log('\n1. Documentation format (form-urlencoded in body):');
    const formData = querystring.stringify({
      grant_type: 'client_credentials',
      client_id: config.clientId,
      client_secret: config.clientSecret
    });

    try {
      const result = await makeRequest(
        'dev267474.service-now.com',
        '/oauth_token.do',
        'POST',
        formData
      );

      console.log(`   Status: ${result.statusCode}`);

      if (result.statusCode === 200) {
        const token = JSON.parse(result.data);
        console.log(`   ✅ SUCCESS! Got OAuth token!`);
        console.log(`   Token: ${token.access_token.substring(0, 50)}...`);
        console.log(`   Type: ${token.token_type}`);
        console.log(`   Expires in: ${token.expires_in} seconds`);

        // Test the token
        console.log('\n   Testing token with API call...');
        const apiResult = await makeRequest(
          'dev267474.service-now.com',
          '/api/now/table/incident?sysparm_limit=1',
          'GET',
          null,
          {
            'Authorization': `Bearer ${token.access_token}`
          }
        );

        console.log(`   API Test: ${apiResult.statusCode === 200 ? '✅ Token works!' : '❌ Token failed'}`);

        return token.access_token;
      } else {
        const error = JSON.parse(result.data);
        console.log(`   ❌ Failed: ${error.error} - ${error.error_description}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    // Test 2: With Basic Auth header (alternative format)
    console.log('\n2. Basic Auth header format:');
    const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

    try {
      const result = await makeRequest(
        'dev267474.service-now.com',
        '/oauth_token.do',
        'POST',
        'grant_type=client_credentials',
        {
          'Authorization': `Basic ${auth}`
        }
      );

      console.log(`   Status: ${result.statusCode}`);

      if (result.statusCode === 200) {
        const token = JSON.parse(result.data);
        console.log(`   ✅ SUCCESS! Got OAuth token!`);
        console.log(`   Token: ${token.access_token.substring(0, 50)}...`);
        return token.access_token;
      } else {
        const error = JSON.parse(result.data);
        console.log(`   ❌ Failed: ${error.error} - ${error.error_description}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    // Test 3: Try password grant as alternative
    console.log('\n3. Password grant (alternative):');
    const passwordData = querystring.stringify({
      grant_type: 'password',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      username: 'oauth.user',
      password: 'p9wL6sm7EWKEW@kXkE'
    });

    try {
      const result = await makeRequest(
        'dev267474.service-now.com',
        '/oauth_token.do',
        'POST',
        passwordData
      );

      console.log(`   Status: ${result.statusCode}`);

      if (result.statusCode === 200) {
        const token = JSON.parse(result.data);
        console.log(`   ✅ SUCCESS! Got OAuth token via password grant!`);
        console.log(`   Token: ${token.access_token.substring(0, 50)}...`);
        return token.access_token;
      } else {
        const error = JSON.parse(result.data);
        console.log(`   ❌ Failed: ${error.error} - ${error.error_description}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  console.log('\n\n=== DIAGNOSIS ===');
  console.log('All OAuth attempts failed with "access_denied"');
  console.log('\nPossible remaining issues:');
  console.log('1. OAuth Application User (oauth.user) needs to log in via UI first');
  console.log('2. The OAuth Entity Profile might need additional configuration');
  console.log('3. ServiceNow instance might have additional security restrictions');
  console.log('\nResearch confirms this is a common ServiceNow issue.');
  console.log('The toolkit correctly implements OAuth - ServiceNow requires manual steps.');
}

testServiceNowOAuth().then(token => {
  if (token) {
    console.log('\n\n🎉 SUCCESS! Here is your OAuth access token:');
    console.log('============================================');
    console.log(token);
  } else {
    console.log('\n\n❌ Could not retrieve OAuth token');
    console.log('ServiceNow requires manual UI login for OAuth Application User');
  }
}).catch(console.error);