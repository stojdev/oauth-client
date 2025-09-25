#!/bin/bash

echo "=== OAuth Inspect Command Examples ==="
echo ""

# Example JWT token (this is a dummy token for demonstration)
SAMPLE_JWT="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ik1UaEVOVUpHTkVNMVFURTRNMEZCTWpkQ05UZzVNRFUxUlRVd1FVSkRNRU13UmtGRVFrRXpSZyJ9.eyJodHRwczovL2FwaS5vcGVucGFpLmNvbS9wcm9maWxlIjp7ImVtYWlsIjoidGVzdEB0ZXN0LmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlfSwiaHR0cHM6Ly9hcGkub3BlbmFpLmNvbS9hdXRoIjp7InBvaWQiOiJvcmctdGVzdDEyMzQiLCJ1c2VyX2lkIjoidXNlci10ZXN0MTIzNCJ9LCJpc3MiOiJodHRwczovL2F1dGgwLm9wZW5haS5jb20vIiwic3ViIjoidGVzdHwxMjM0NTY3ODkwIiwiYXVkIjpbImh0dHBzOi8vYXBpLm9wZW5haS5jb20vdjEiLCJodHRwczovL29wZW5haS5hdXRoMC5jb20vdXNlcmluZm8iXSwiaWF0IjoxNzI3MjM5MjAwLCJleHAiOjE3MjgxMDMyMDAsInNjb3BlIjoib3BlbmlkIGVtYWlsIHByb2ZpbGUgbW9kZWwucmVhZCBtb2RlbC5yZXF1ZXN0IG9yZ2FuaXphdGlvbi5yZWFkIG9yZ2FuaXphdGlvbi53cml0ZSBvZmZsaW5lX2FjY2VzcyIsImF6cCI6InRlc3QtY2xpZW50LWlkIn0.test-signature"

echo "1. Inspect a JWT token directly:"
echo "   oauth inspect '$SAMPLE_JWT'"
echo ""

echo "2. Inspect with raw output (shows header, payload, signature):"
echo "   oauth inspect '$SAMPLE_JWT' --raw"
echo ""

echo "3. Inspect with validation:"
echo "   oauth inspect '$SAMPLE_JWT' --validate"
echo ""

echo "4. Inspect a stored token:"
echo "   oauth inspect -p token_1"
echo ""

echo "5. Inspect from clipboard (if you copied a token):"
echo "   oauth inspect"
echo ""

echo "6. Inspect from pipe:"
echo "   echo '$SAMPLE_JWT' | oauth inspect"
echo ""

echo "=== Try this example JWT (it will show decoded data): ==="
echo ""
oauth inspect "$SAMPLE_JWT"