# Token Storage Documentation

## Storage Location

Tokens are securely stored in your home directory:

```plain
~/.oauth-client/tokens/tokens.enc
```

## Storage Format

- **Encryption**: AES-256-GCM encryption
- **Key Management**:
  - Uses `TOKEN_ENCRYPTION_KEY` environment variable if set
  - Otherwise generates and stores a key in `~/.oauth-client/key`
- **File Format**: Encrypted JSON containing token data

## CLI Commands

### Save a Token

```bash
oauth token client-credentials \
  --token-url https://example.com/oauth/token \
  --client-id YOUR_CLIENT_ID \
  --client-secret YOUR_SECRET \
  --save my-token-name
```

### List Stored Tokens

```bash
oauth list-tokens
```

### Use a Stored Token

```bash
# Tokens are automatically used when you use the same provider name
oauth refresh my-token-name
```

### Clear All Tokens

```bash
oauth clear-tokens
```

### Remove Specific Token

```bash
oauth tokens:remove my-token-name
```

## Security Notes

1. **Encryption Key**: Set `TOKEN_ENCRYPTION_KEY` environment variable for production use

   ```bash
   export TOKEN_ENCRYPTION_KEY="your-32-character-encryption-key"
   ```

2. **File Permissions**: Token directory is created with 700 permissions (owner only)

3. **Token Expiry**: Expired tokens are automatically detected and logged

## Example Workflow

```bash
# 1. Save a token with a name
oauth token client-credentials \
  --token-url https://api.example.com/oauth/token \
  --client-id abc123 \
  --client-secret secret123 \
  --save production-api

# 2. List your tokens
oauth list-tokens
# Output: - production-api: eyJhbGciOiJSUzI1NiIs...

# 3. Use in scripts
TOKEN=$(oauth list-tokens | grep production-api | awk '{print $2}')
curl -H "Authorization: Bearer $TOKEN" https://api.example.com/data

# 4. Clean up when done
oauth tokens:remove production-api
```

## Troubleshooting

- **"No stored tokens found"**: Tokens haven't been saved yet or the encryption key has changed
- **"Token expired"**: The stored token has expired and needs to be refreshed
- **Permission errors**: Check that `~/.oauth-client/` directory has proper permissions
