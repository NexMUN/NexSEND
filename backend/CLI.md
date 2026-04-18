# Notification Backend CLI

Production-oriented CLI for service key operations and SES readiness checks.

## Capabilities

- Interactive and descriptive service-key creation workflow
- Permission presets for fast setup (`main-backend`, `email-sender`)
- Custom permission-map support with checkbox-style selector for least-privilege access
- Optional secure credential export to local file
- SES production-readiness verification trigger
- Clear usage/help surface for operators

## Commands

```bash
pnpm cli
pnpm cli -- help
pnpm cli -- capabilities
pnpm cli -- create-service-key
pnpm cli -- create-service-key --preset=main-backend
pnpm cli -- verify-production
```

## PNPM Shortcuts

```bash
pnpm service-key:create
pnpm service-key:create-main
pnpm verify:production
```

## Interactive Flow

`pnpm cli` opens a menu:

1. Show capabilities
2. Create service key
3. Run SES production verification
4. Show usage

When you choose `custom` permissions, the CLI opens a checkbox-style selector:

- `[ ]/[x]` toggles per permission
- multi-toggle input (for example: `1 4 6`)
- commands: `all`, `none`, `done`

## Service Key Output

The CLI returns:

- `X-Service-Id`
- `X-Service-Key` (one-time reveal)
- Permission map
- Rate limits
- Header/cURL example for immediate API use

## Production Notes

- Ensure `DATABASE_URL` is configured before creating keys.
- Keep exported key files outside VCS and secret-scan protected.
- Run `pnpm verify:production` before deployment.
