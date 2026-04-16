import { spawnSync } from 'child_process';

const result = spawnSync(
  'npx',
  [
    '--yes',
    'ts-node',
    '-O',
    '{"module":"commonjs","moduleResolution":"node"}',
    '--transpile-only',
    'scripts/production-cli.ts',
    'create-service-key',
    '--preset=main-backend',
  ],
  { stdio: 'inherit', cwd: process.cwd() }
);

process.exit(result.status === null ? 1 : result.status);
