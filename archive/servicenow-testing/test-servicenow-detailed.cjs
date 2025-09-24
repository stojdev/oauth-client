#!/usr/bin/env node

const https = require('https');
const querystring = require('querystring');

async function testOAuth(clientId, clientSecret, name) {
    console.log(`\n=== Testing ${name} ===`);

    const configs = [
        {
            name: 'Standard client_credentials',
            data: querystring.stringify({
                grant_type: 'client_credentials',
                client_id: clientId,
                client_secret: clientSecret
            }),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            }
        },
        {
            name: 'With scope parameter',
            data: querystring.stringify({
                grant_type: 'client_credentials',
                client_id: clientId,
                client_secret: clientSecret,
                scope: 'useraccount'
            }),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            }
        },
        {
            name: 'Basic Auth header',
            data: querystring.stringify({
                grant_type: 'client_credentials'
            }),
            headers: {
                'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            }
        },
        {
            name: 'Basic Auth with scope',
            data: querystring.stringify({
                grant_type: 'client_credentials',
                scope: 'useraccount'
            }),
            headers: {
                'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            }
        },
        {
            name: 'ServiceNow specific - response_type token',
            data: querystring.stringify({
                grant_type: 'client_credentials',
                client_id: clientId,
                client_secret: clientSecret,
                response_type: 'token'
            }),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            }
        }
    ];

    for (const config of configs) {
        console.log(`\nTrying: ${config.name}`);
        console.log(`Data: ${config.data}`);

        const options = {
            hostname: 'dev267474.service-now.com',
            port: 443,
            path: '/oauth_token.do',
            method: 'POST',
            headers: {
                ...config.headers,
                'Content-Length': Buffer.byteLength(config.data)
            }
        };

        await new Promise((resolve) => {
            const req = https.request(options, (res) => {
                let data = '';

                console.log(`Status: ${res.statusCode}`);
                console.log(`Headers: ${JSON.stringify(res.headers, null, 2)}`);

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    console.log(`Response: ${data}`);
                    try {
                        const json = JSON.parse(data);
                        if (json.access_token) {
                            console.log('🎉 SUCCESS! Got access token!');
                            console.log(`Token: ${json.access_token.substring(0, 50)}...`);
                        }
                    } catch (e) {
                        // Not JSON
                    }
                    resolve();
                });
            });

            req.on('error', (e) => {
                console.error(`Request error: ${e.message}`);
                resolve();
            });

            req.write(config.data);
            req.end();
        });
    }
}

// Test OAuth Test 1
testOAuth(
    '59fadc6d0c24031afa3d7f800185112',
    '+-pri~-v[~',
    'OAuth Test 1'
).then(() => {
    // Test OAuth Test 2
    return testOAuth(
        '34c9baf9dd6a463b99ab4fdd36666e65c',
        'E;t#d0POBa',
        'OAuth Test 2'
    );
});