#!/bin/bash
# test_webhook.sh
# Tests the Helius Webhook locally

SECRET="my-test-secret"
MINT="test-nft-mint-address"

echo "Testing Helius Webhook on localhost:3000..."

curl -X POST http://localhost:3000/api/webhooks/helius \
  -H "Content-Type: application/json" \
  -H "Authorization: $SECRET" \
  -d '[
    {
      "type": "TRANSFER",
      "signature": "test-signature-123",
      "slot": 123456789,
      "tokenTransfers": [
        {
          "mint": "'$MINT'",
          "fromUserAccount": "old-owner-wallet",
          "toUserAccount": "new-owner-wallet",
          "tokenAmount": 1
        }
      ]
    }
  ]'

echo ""
echo "Done testing webhook."
