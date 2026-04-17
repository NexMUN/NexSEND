# Notification Backend (Amazon SES Only)

Scalable email notification service for organization-scoped domain sending, now standardized on **Amazon SES** for production reliability.

## Core Capabilities

- Queue-based email delivery with retry tracking
- Organization + domain management
- SES-backed email sending
- Domain DNS verification workflow (TXT, DKIM, SPF, SES verification)
- Service-key authenticated internal APIs

## Provider Model

This service is intentionally **SES-only**.

- `EMAIL_PROVIDER=SES` is the only supported runtime mode
- Non-SES fallback paths are removed from runtime and config surfaces
- Database provider-related fields are retained for future expansion but are not active

## Required Environment

```bash
EMAIL_PROVIDER=SES
AWS_REGION=eu-north-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

## Local Setup

```bash
yarn install
yarn prisma:generate
yarn prisma:migrate:dev
yarn start:dev
```

## API Surface

- Domain setup and verification endpoints under internal org routes
- Email send + job status endpoints under internal org routes
- Health endpoint for readiness/liveness checks

## Domain Verification Notes

For each managed domain, configure records returned by the DNS records endpoint:

- `_notification-verify.<domain>` TXT
- `<selector>._domainkey.<domain>` TXT (DKIM)
- SPF TXT include guidance
- SES domain verification TXT and SES DKIM CNAME records

## Operations

Recommended release gate for production changes:

1. Build/typecheck passes
2. Domain verification flow validated
3. Queue processing path validated
4. Health endpoint validated
5. SES credential path validated

## Security Notes

- Use least-privileged IAM credentials for SES
- Rotate keys periodically
- Keep production secrets out of committed `.env` files
