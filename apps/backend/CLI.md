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
bun run cli
bun run cli -- help
bun run cli -- capabilities
bun run cli -- create-service-key
bun run cli -- create-service-key --preset=main-backend
bun run cli -- verify-production
```

## Bun Shortcuts

```bash
bun run service-key:create
bun run service-key:create-main
bun run verify:production
```

## Interactive Flow

`bun run cli` opens a menu:

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
- Run `bun run verify:production` before deployment.
