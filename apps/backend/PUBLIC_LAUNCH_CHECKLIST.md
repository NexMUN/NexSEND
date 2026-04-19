# Public Launch Checklist

## Branch & Release
- [ ] Confirm launch branch (`v1`) is up to date and protected
- [ ] Set repository default branch to launch branch in remote hosting settings
- [ ] Require CI checks before merge

## Security & Secrets
- [ ] No production secrets in tracked files
- [ ] Use only `.env.example` and `.env.production.example` templates in VCS
- [ ] Load real secrets through deployment secret manager
- [ ] Rotate previously exposed keys before launch

## Runtime
- [ ] `EMAIL_PROVIDER=SES` in production
- [ ] AWS SES credentials + region configured in runtime environment
- [ ] Domain verification flow validated on production domain
- [ ] Health endpoint monitored (`/api/health`)

## Verification
- [ ] `bun run build` passes
- [ ] `bun run verify:production` passes
- [ ] Smoke test send via internal email API

## CLI (Ops)
- [ ] `bun run cli` usage documented for operators
- [ ] Service-key creation done via CLI presets or checkbox permissions
- [ ] Issued keys stored in secure vault (not files in repo)

## Cleanup
- [ ] Remove non-essential local artifacts/logs before release tagging
- [ ] Confirm docs in root are current (`CLI.md`, launch checklist)
