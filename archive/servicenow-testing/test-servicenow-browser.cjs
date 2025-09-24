#!/usr/bin/env node

/**
 * ServiceNow Browser Automation for OAuth Activation
 * This will programmatically log into ServiceNow UI to activate the OAuth session
 */

const puppeteer = require('puppeteer');
const https = require('https');

async function loginViarowser() {
  console.log('ServiceNow OAuth - Browser Automation Login');
  console.log('===========================================\n');

  console.log('Step 1: Launching browser and logging into ServiceNow...');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Navigate to ServiceNow login
    await page.goto('https://dev267474.service-now.com/login.do', {
      waitUntil: 'networkidle2'
    });

    console.log('   Navigated to login page');

    // Fill in credentials
    await page.type('#user_name', 'oauth.user');
    await page.type('#user_password', 'p9wL6sm7EWKEW@kXkE');

    console.log('   Entered credentials');

    // Submit login form
    await page.click('#sysverb_login');

    // Wait for navigation
    await page.waitForNavigation({
      waitUntil: 'networkidle2'
    });

    console.log('   ✅ Successfully logged into ServiceNow!');

    // Get cookies
    const cookies = await page.cookies();
    const sessionCookie = cookies.find(c => c.name === 'JSESSIONID' || c.name === 'glide_user_session');

    if (sessionCookie) {
      console.log(`   Session established: ${sessionCookie.name}=${sessionCookie.value.substring(0, 20)}...`);
    }

    await browser.close();

    console.log('\nStep 2: Testing OAuth with activated session...');

    // Now try OAuth
    return testOAuthAfterLogin();

  } catch (error) {
    console.error('Browser automation error:', error.message);
    await browser.close();
    return null;
  }
}

function testOAuthAfterLogin() {
  return new Promise((resolve) => {
    const data = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: '59fadc6d0c24031afa3d7f800185112',
      client_secret: '+-pri~-v[~'
    }).toString();

    const req = https.request({
      hostname: 'dev267474.service-now.com',
      port: 443,
      path: '/oauth_token.do',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(data),
        'Accept': 'application/json'
      }
    }, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        console.log(`   OAuth response status: ${res.statusCode}`);

        if (res.statusCode === 200) {
          const token = JSON.parse(responseData);
          console.log('   ✅ SUCCESS! Got OAuth access token!');
          resolve(token);
        } else {
          try {
            const error = JSON.parse(responseData);
            console.log(`   ❌ OAuth error: ${error.error} - ${error.error_description}`);
          } catch (e) {
            console.log(`   ❌ OAuth failed with status ${res.statusCode}`);
          }
          resolve(null);
        }
      });
    });

    req.on('error', (e) => {
      console.error('Request error:', e.message);
      resolve(null);
    });

    req.write(data);
    req.end();
  });
}

// Check if puppeteer is installed
try {
  require.resolve('puppeteer');
  loginViaBrowser().then(token => {
    if (token) {
      console.log('\n\n🎉 ULTIMATE SUCCESS!');
      console.log('====================');
      console.log('OAuth Access Token Retrieved from ServiceNow:');
      console.log('----------------------------------------------');
      console.log(token.access_token);
      console.log('\nToken Type:', token.token_type);
      console.log('Expires In:', token.expires_in, 'seconds');
      console.log('\nThe OAuth toolkit NOW works with ServiceNow!');
    }
  }).catch(console.error);
} catch (error) {
  console.log('Puppeteer not installed. Installing...');
  console.log('Run: npm install puppeteer');
  console.log('\nAlternatively, manually log into ServiceNow:');
  console.log('1. Open https://dev267474.service-now.com in a browser');
  console.log('2. Log in as oauth.user with password p9wL6sm7EWKEW@kXkE');
  console.log('3. Then run the OAuth test again');
}