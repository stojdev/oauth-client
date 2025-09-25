# ServiceNow OAuth Application User Requirements

## Critical Requirements for OAuth to Work

The OAuth Application User (Stefan Ojebom/OJESTE) must meet these requirements:

### 1. User Status Requirements

- **Active**: User must be active (not deactivated)
- **Not Locked**: Account cannot be locked (no failed login lockouts)
- **Password Set**: User must have a valid password configured

### 2. User Settings to Check

In the User record for Stefan Ojebom (OJESTE):

- [ ] **Active** checkbox must be checked
- [ ] **Locked out** checkbox must be unchecked
- [ ] **Password needs reset** checkbox should be unchecked
- [ ] **Web service access only** checkbox should be checked (for service accounts)

### 3. OAuth Entity Profile

Check the OAuth Entity Profile related list:

- [ ] Grant Type must include "Client Credentials"
- [ ] Entity must be active

### 4. Roles (if needed)

The user might need:

- `rest_api_explorer` role for API access
- Or specific roles based on what APIs will be accessed

## Quick Test Commands

Once user is properly configured:

```bash
# Test with client_credentials
curl -X POST https://devskandia.service-now.com/oauth_token.do \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=0d08b5c2bed86dd05132321f2ba1dc3e" \
  -d "client_secret=b7QWIjmkXI" \
  -d "scope=useraccount"
```

## If Still Failing

1. Check System Logs in ServiceNow for specific error details
2. Verify OAuth Entity Profile shows "Client Credentials" in grant types
3. Ensure user has logged in at least once (to activate account)
4. Check if MFA/2FA is blocking service account access
