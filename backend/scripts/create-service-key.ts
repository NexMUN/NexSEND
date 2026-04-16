import { spawnSync } from 'child_process';

const args = process.argv.slice(2);
const result = spawnSync(
  'npx',
  ['--yes', 'ts-node', '-O', '{"module":"commonjs","moduleResolution":"node"}', '--transpile-only', 'scripts/production-cli.ts', 'create-service-key', ...args],
  { stdio: 'inherit', cwd: process.cwd() }
);

process.exit(result.status === null ? 1 : result.status);
