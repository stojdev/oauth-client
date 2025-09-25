# OAuth Inspect Command Usage

## Overview
The `oauth inspect` command decodes and analyzes OAuth tokens, particularly JWT (JSON Web Tokens).

## Usage Methods

### 1. Inspect a Stored Token
```bash
# Use -p flag with the provider/token name
oauth inspect -p token_1
oauth inspect --provider servicenow
```

### 2. Inspect a Token Directly
```bash
# Pass the token as an argument
oauth inspect eyJhbGciOiJSUzI1NiIs...
```

### 3. Inspect from Clipboard
```bash
# If you've copied a token to clipboard
oauth inspect
```

### 4. Inspect from Pipe
```bash
# Pipe a token into the command
echo "eyJhbGciOiJSUzI1NiIs..." | oauth inspect

# From a file
cat token.txt | oauth inspect
```

### 5. Inspect with Options

#### Show Raw Token Parts
```bash
oauth inspect <token> --raw
# Shows: header, payload, signature separately
```

#### Validate Token Structure
```bash
oauth inspect <token> --validate
# Performs structural validation
```

## Token Types

### JWT Tokens
- Fully decoded showing header, payload, signature
- Shows expiration status
- Displays all claims in readable format
- Shows formatted dates for iat/exp claims

### Opaque Tokens
- Displays the token value
- Notes that it's not JWT format
- Common with some providers like ServiceNow

## Example Output

### For JWT Token:
```
============================================================
JWT TOKEN INSPECTION
============================================================

HEADER:
{
  "alg": "RS256",
  "typ": "JWT",
  "kid": "key-id-123"
}

PAYLOAD:
{
  "iss": "https://auth.example.com/",
  "sub": "user123",
  "aud": "api.example.com",
  "exp": 1728103200,
  "scope": "read write",
  "exp_formatted": "2024-10-05T04:40:00.000Z"
}

STATUS:
✅ Token is VALID (expires in 2h 15m)
```

### For Opaque Token:
```
Token appears to be opaque (not JWT format)
Token: QExdHvNvbm_jkcr3dKlWUR16nO8R...
```

## Practical Examples

### Check if a Stored Token is Expired
```bash
oauth inspect -p my-api-token
# Look for: ❌ Token is EXPIRED
```

### Debug API Authentication Issues
```bash
# Get the token you're using
TOKEN=$(oauth list-tokens | grep production | awk '{print $2}')

# Inspect it to check expiration and scopes
echo $TOKEN | oauth inspect
```

### Compare Two Tokens
```bash
oauth inspect -p token1 > token1.txt
oauth inspect -p token2 > token2.txt
diff token1.txt token2.txt
```

## Tips

1. **ServiceNow tokens** are typically opaque (not JWT), so you'll only see the token value
2. **JWT tokens** from providers like Auth0, Google, Azure will show full decoded information
3. **Expired tokens** are clearly marked with ❌
4. **The clipboard feature** automatically copies decoded payload for easy sharing

## Security Note
⚠️ The inspect command does NOT verify token signatures. It only decodes and displays token contents. For secure validation, use the test commands with proper JWKS verification.