#!/bin/bash

echo "Testing ServiceNow OAuth with verbose output"
echo "============================================"

curl -X POST https://devskandia.service-now.com/oauth_token.do \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Accept: application/json" \
  -d "grant_type=client_credentials" \
  -d "client_id=0d08b5c2bed86dd05132321f2ba1dc3e" \
  -d "client_secret=b7QWIjmkXI" \
  -v