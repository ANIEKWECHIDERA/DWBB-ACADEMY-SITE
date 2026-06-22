# Paystack Webhook Setup

Your webhook endpoint is:

`POST /api/payments/webhook`

## Local development

Paystack cannot reach `localhost` directly, so expose your local server publicly with a tunnel.

Examples:

```bash
ngrok http 8787
```

or

```bash
cloudflared tunnel --url http://localhost:8787
```

If your tunnel URL is:

`https://abcd-1234.ngrok-free.app`

then set this webhook URL in Paystack Dashboard:

`https://abcd-1234.ngrok-free.app/api/payments/webhook`

## Paystack Dashboard steps

1. Open Paystack Dashboard
2. Switch to `Test Mode`
3. Go to `Settings > API Keys & Webhooks`
4. Paste your public webhook URL
5. Save

## Notes

- The server already verifies the `x-paystack-signature` header using your Paystack secret key.
- Webhook events are logged locally to:
  - `server/.data/webhook-events.json`
- Transaction initialization attempts are logged locally to:
  - `server/.data/payment-attempts.json`

## Useful debug endpoints

When the local backend is running:

- `GET /api/payments/debug/attempts`
- `GET /api/payments/debug/webhooks`

These are meant for development debugging only.
