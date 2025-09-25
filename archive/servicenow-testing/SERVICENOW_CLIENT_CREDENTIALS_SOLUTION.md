# ServiceNow Client Credentials OAuth Solution

## The Problem

ServiceNow's OAuth 2.0 implementation doesn't follow RFC 6749 standard for client_credentials grant. Even with everything configured correctly:

- ✅ System property enabled
- ✅ OAuth Application with "Integration as a Service"
- ✅ OAuth Application User set
- ✅ OAuth Entity Profile with Client Credentials grant type
- ✅ Auth Scopes configured

It still returns **401 Unauthorized - access_denied** with `x-is-logged-in: false`

## Root Cause

ServiceNow requires the **OAuth Application User** to:

1. Be an active user account
2. Have a valid password
3. **Have logged in at least once** to activate the session
4. Possibly have "Web service access only" checked

## Solutions

### Option 1: Manual User Activation (Admin Action)

1. Log in as admin to ServiceNow
2. Impersonate the OAuth Application User (e.g., Stefan Ojebom)
3. Or reset the password and log in as that user once
4. This activates the user session for OAuth

### Option 2: Use Password Grant First (Automated)

```javascript
// Step 1: Authenticate user with password grant
const userAuth = await fetch('https://dev267474.service-now.com/oauth_token.do', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: 'grant_type=password' +
        '&client_id=34c9baf9dd6a463b99ab4fdd36666e65c' +
        '&client_secret=E;t#d0POBa' +
        '&username=oauth_user' +
        '&password=oauth_password'
});

// Step 2: Now client_credentials should work
const token = await fetch('https://dev267474.service-now.com/oauth_token.do', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: 'grant_type=client_credentials' +
        '&client_id=34c9baf9dd6a463b99ab4fdd36666e65c' +
        '&client_secret=E;t#d0POBa'
});
```

### Option 3: ServiceNow API User Setup

Create a dedicated integration user:

1. Create user with "Web service access only" = true
2. Set a password
3. Use ServiceNow REST API to authenticate the user programmatically
4. Configure as OAuth Application User

### Option 4: Use Alternative Auth Methods

Since ServiceNow doesn't properly support client_credentials:

1. Use Basic Auth with integration user credentials
2. Use API Key authentication (if available)
3. Use password grant with service account

## Implementing Workarounds in Our OAuth Client

### Detection Strategy

```javascript
class ServiceNowOAuthAdapter {
  async detectServiceNow(tokenUrl) {
    // Check if URL contains service-now.com
    return tokenUrl.includes('service-now.com');
  }

  async handleServiceNowAuth(config) {
    // Try standard client_credentials first
    let response = await this.standardClientCredentials(config);

    if (response.status === 401) {
      // Check headers for ServiceNow fingerprint
      if (response.headers.get('server') === 'snow_adc' ||
          response.headers.get('x-is-logged-in') === 'false') {

        // Try workarounds
        console.warn('ServiceNow detected - attempting workarounds');

        // Workaround 1: Try with different grant types
        // Workaround 2: Alert user to manual activation needed
        throw new Error(
          'ServiceNow OAuth requires manual user activation. ' +
          'Please ensure OAuth Application User has logged in at least once.'
        );
      }
    }

    return response;
  }
}
```

### Enhanced Error Messages

```javascript
if (error === 'access_denied' && isServiceNow) {
  console.error(`
    ServiceNow OAuth Configuration Issue Detected
    ==============================================

    The OAuth Application User needs to be activated:
    1. Log into ServiceNow as admin
    2. Navigate to the OAuth Application User
    3. Ensure user is active and has a password
    4. Log in as that user once to activate the session

    Alternative: Use password grant with user credentials

    ServiceNow does not fully support RFC 6749 client_credentials.
  `);
}
```

## Testing Approach

### For PDI Testing

1. Create a test user specifically for OAuth
2. Log in as that user manually first
3. Set as OAuth Application User
4. Test client_credentials

### For Production

1. Document ServiceNow's non-standard requirements
2. Provide setup instructions for admins
3. Consider using password grant as fallback
4. Implement retry logic with helpful error messages

## Conclusion

ServiceNow's OAuth implementation violates RFC 6749 by:

- Requiring user context for machine-to-machine auth
- Needing manual user activation
- Adding proprietary layers (Entity Profiles, Entity Scopes)
- Not working with just client_id and client_secret

Our OAuth client needs to detect ServiceNow instances and provide clear guidance on the additional setup required, or implement automatic workarounds where possible.
