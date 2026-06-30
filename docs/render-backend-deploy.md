# Render Backend Deployment

This app is set up to deploy the backend as a Render web service using [render.yaml](/C:/Users/Chidera%20Aniekwe/Projects/DWBB%20ACADEMY/render.yaml).

## Service type

- Runtime: `Node`
- Service type: `Web Service`
- Plan: `Starter`
- Start command: `npm run start:server`
- Health check path: `/api/health`

## Persistent disk

The backend stores purchases, debug attempts, and webhook logs on disk.

Use a Render persistent disk:

- Mount path: `/var/data`
- Size: `1 GB`
- `DATA_DIR=/var/data`

## Required environment variables

- `APP_BASE_URL`
  - Value: your live frontend URL
  - Example: `https://dwbbacademy.netlify.app`

- `ALLOWED_ORIGINS`
  - Value: the frontend origins allowed to call the backend
  - Example: `https://dwbbacademy.netlify.app`

- `PAYSTACK_PUBLIC_KEY`
  - Value: your Paystack public key

- `PAYSTACK_SECRET_KEY`
  - Value: your Paystack secret key

- `SMTP_USER`
  - Value: your Brevo SMTP username

- `SMTP_PASS`
  - Value: your Brevo SMTP password

- `SMTP_FROM`
  - Value: your sender identity
  - Example: `DWBB Academy <no-reply@dwbbacademy.com>`

## Recommended environment variables

- `NODE_ENV=production`
- `SMTP_HOST=smtp-relay.brevo.com`
- `SMTP_PORT=587`
- `SMTP_SECURE=false`
- `ENABLE_PAYMENT_DEBUG=false`
- `DOWNLOAD_LINK_TTL_DAYS=7`
- `TRUST_PROXY=1`
- `DATA_DIR=/var/data`

## Netlify connection

If the frontend is hosted on Netlify, set:

- Netlify `VITE_API_BASE_URL`
  - Value: your Render backend URL
  - Example: `https://dwbb-academy-api.onrender.com`

Then set the backend values to match:

- `APP_BASE_URL=https://your-netlify-site.netlify.app`
- `ALLOWED_ORIGINS=https://your-netlify-site.netlify.app`

## Paystack values after deploy

After the Render backend is live:

- Webhook URL:
  - `https://your-render-service.onrender.com/api/payments/webhook`

- Callback URL in Dashboard:
  - `https://your-netlify-site.netlify.app/payment/success`

The backend also sends a per-transaction callback URL during initialization.
