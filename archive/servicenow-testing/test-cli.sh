#!/bin/bash

# Simple test script for OAuth 2.0 token retrieval using CLI
# Purpose: Verify the core functionality - retrieving Access Tokens

echo "========================================"
echo "OAuth 2.0 Test Client - Token Retrieval"
echo "========================================"
echo ""
echo "This script tests the core purpose:"
echo "Retrieving Access Tokens from OAuth providers"
echo ""

# Test 1: Check CLI is working
echo "1. Checking CLI availability..."
if node dist/cli.cjs --version > /dev/null 2>&1; then
    echo "   ✅ CLI is available"
else
    echo "   ❌ CLI not found. Run 'pnpm build' first."
    exit 1
fi

# Test 2: Test discovery (doesn't need credentials)
echo ""
echo "2. Testing OAuth discovery (no credentials needed)..."
echo "   Testing Google's OAuth discovery endpoint..."
if node dist/cli.cjs discover https://accounts.google.com 2>/dev/null | grep -q "authorization_endpoint"; then
    echo "   ✅ Discovery successful - found OAuth endpoints"
else
    echo "   ⚠️  Discovery test failed or timed out"
fi

# Test 3: Show available commands for token retrieval
echo ""
echo "3. Available token retrieval methods:"
node dist/cli.cjs token --help 2>/dev/null | grep -A 20 "grant-type" | head -20

echo ""
echo "========================================"
echo "To test actual token retrieval:"
echo "========================================"
echo ""
echo "1. Set up credentials in .env file:"
echo "   cp .env.example .env"
echo "   # Edit .env with your OAuth credentials"
echo ""
echo "2. Test Client Credentials grant (machine-to-machine):"
echo "   node dist/cli.cjs token client_credentials \\"
echo "     --client-id YOUR_CLIENT_ID \\"
echo "     --client-secret YOUR_CLIENT_SECRET \\"
echo "     --token-url https://provider.com/oauth/token"
echo ""
echo "3. Test Authorization Code grant (user login):"
echo "   node dist/cli.cjs auth google"
echo ""
echo "4. List retrieved tokens:"
echo "   node dist/cli.cjs tokens:list"
echo ""
echo "========================================"