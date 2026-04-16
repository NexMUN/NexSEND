import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as readline from 'readline';
import { spawnSync } from 'child_process';

type PermissionMap = Record<string, string[]>;
type PermissionOption = {
  id: string;
  resource: string;
  action: string;
  label: string;
  description: string;
};

const prisma = new PrismaClient();
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const question = (prompt: string): Promise<string> =>
  new Promise((resolve) => rl.question(prompt, (answer) => resolve(answer.trim())));

function printHeader(title: string): void {
  console.log(`\n=== ${title} ===`);
}

function parsePermissions(raw: string): PermissionMap {
  const map: PermissionMap = {};
  const chunks = raw.split(',').map((x) => x.trim()).filter(Boolean);

  for (const chunk of chunks) {
    const [resource, action] = chunk.split(':').map((x) => x.trim());
    if (!resource) {
      continue;
    }
    if (!map[resource]) {
      map[resource] = [];
    }
    if (action) {
      map[resource].push(action);
    }
  }

  return map;
}

function buildPermissionMapFromSelection(options: PermissionOption[], selectedIds: Set<string>): PermissionMap {
  const map: PermissionMap = {};

  for (const option of options) {
    if (!selectedIds.has(option.id)) {
      continue;
    }

    if (!map[option.resource]) {
      map[option.resource] = [];
    }
    map[option.resource].push(option.action);
  }

  return map;
}

async function choosePermissionsInteractive(): Promise<PermissionMap> {
  const options: PermissionOption[] = [
    {
      id: '1',
      resource: 'organizations',
      action: 'read',
      label: 'organizations:read',
      description: 'Read organization metadata and status.',
    },
    {
      id: '2',
      resource: 'organizations',
      action: '*',
      label: 'organizations:*',
      description: 'Full organization access (read/write/manage).',
    },
    {
      id: '3',
      resource: 'domains',
      action: 'read',
      label: 'domains:read',
      description: 'Read domain records and verification status.',
    },
    {
      id: '4',
      resource: 'domains',
      action: 'manage',
      label: 'domains:manage',
      description: 'Create/update/verify organization domains.',
    },
    {
      id: '5',
      resource: 'domains',
      action: '*',
      label: 'domains:*',
      description: 'Full domain access.',
    },
    {
      id: '6',
      resource: 'emails',
      action: 'send',
      label: 'emails:send',
      description: 'Send emails through queued SES flow.',
    },
    {
      id: '7',
      resource: 'emails',
      action: 'read',
      label: 'emails:read',
      description: 'Read email job status/history.',
    },
    {
      id: '8',
      resource: 'emails',
      action: '*',
      label: 'emails:*',
      description: 'Full email access (send/read/manage).',
    },
  ];

  const selectedIds = new Set<string>(['6']);

  while (true) {
    printHeader('Permission Selector (Checkbox Style)');
    console.log('Toggle permissions by number. Multiple values allowed: `1 4 6`');
    console.log('Commands: `all` | `none` | `done`');
    console.log('');

    for (const option of options) {
      const checked = selectedIds.has(option.id) ? 'x' : ' ';
      console.log(`[${checked}] ${option.id}. ${option.label} - ${option.description}`);
    }

    const input = (await question('\nSelect/toggle entries, or `done`: ')).toLowerCase();
    if (input === 'done') {
      break;
    }
    if (input === 'all') {
      options.forEach((option) => selectedIds.add(option.id));
      continue;
    }
    if (input === 'none') {
      selectedIds.clear();
      continue;
    }

    const tokens = input.split(/[,\s]+/).map((x) => x.trim()).filter(Boolean);
    for (const token of tokens) {
      const match = options.find((option) => option.id === token);
      if (!match) {
        console.log(`Ignoring unknown option: ${token}`);
        continue;
      }
      if (selectedIds.has(match.id)) {
        selectedIds.delete(match.id);
      } else {
        selectedIds.add(match.id);
      }
    }
  }

  const permissions = buildPermissionMapFromSelection(options, selectedIds);
  if (Object.keys(permissions).length === 0) {
    throw new Error('At least one permission must be selected.');
  }
  return permissions;
}

function generateCredentials() {
  const apiKey = crypto.randomBytes(32).toString('hex');
  const hashedApiKey = crypto.createHash('sha256').update(apiKey).digest('hex');
  const serviceId = `svc_${crypto.randomBytes(16).toString('hex')}`;
  return { apiKey, hashedApiKey, serviceId };
}

function printCapabilities(): void {
  printHeader('Notification Backend CLI Capabilities');
  console.log('- Interactive service-key creation with permission presets');
  console.log('- Custom permission-map creation for least-privilege production access');
  console.log('- Secure one-time API key reveal with optional local save');
  console.log('- Header/cURL usage examples for immediate integration');
  console.log('- SES production-readiness verification trigger');
  console.log('- Clear validation and descriptive operator prompts');
}

function printUsage(): void {
  printHeader('Usage');
  console.log('`npm run cli`');
  console.log('`npm run cli -- help`');
  console.log('`npm run cli -- capabilities`');
  console.log('`npm run cli -- create-service-key`');
  console.log('`npm run cli -- create-service-key --preset main-backend`');
  console.log('`npm run cli -- verify-production`');
}

async function createServiceKeyFlow(forcedPreset?: string): Promise<void> {
  printHeader('Create Service Key');

  if (!process.env.DATABASE_URL) {
    console.log('Warning: DATABASE_URL is not set in this shell. Prisma may fail if DB is unreachable.');
  }

  let preset = forcedPreset;
  if (!preset) {
    console.log('\nSelect permission preset:');
    console.log('1. main-backend  -> full organizations/domains/emails access');
    console.log('2. email-sender  -> minimal production sender (emails:send only)');
    console.log('3. custom        -> interactive checkbox permission selector');

    const choice = await question('Enter choice [1/2/3] (default: 2): ');
    if (choice === '1') preset = 'main-backend';
    else if (choice === '3') preset = 'custom';
    else preset = 'email-sender';
  }

  const defaultName =
    preset === 'main-backend'
      ? 'Main Backend Service'
      : preset === 'email-sender'
        ? 'External Email Sender'
        : 'Custom Service';

  const nameInput = await question(`Service name (default: ${defaultName}): `);
  const serviceName = nameInput || defaultName;

  let permissions: PermissionMap;
  if (preset === 'main-backend') {
    permissions = { organizations: ['*'], domains: ['*'], emails: ['*'] };
  } else if (preset === 'email-sender') {
    permissions = { emails: ['send'] };
  } else {
    permissions = await choosePermissionsInteractive();
  }

  const webhookInput = await question('Webhook URL (optional, press Enter to skip): ');
  const webhookUrl = webhookInput || null;

  const rateHourInput = await question('Rate limit per hour (default: 1000): ');
  const rateDayInput = await question('Rate limit per day (default: 10000): ');
  const rateLimitPerHour = Number(rateHourInput || '1000');
  const rateLimitPerDay = Number(rateDayInput || '10000');

  if (!Number.isFinite(rateLimitPerHour) || rateLimitPerHour <= 0) {
    throw new Error('Invalid rateLimitPerHour. Must be a positive number.');
  }
  if (!Number.isFinite(rateLimitPerDay) || rateLimitPerDay <= 0) {
    throw new Error('Invalid rateLimitPerDay. Must be a positive number.');
  }

  const { apiKey, hashedApiKey, serviceId } = generateCredentials();

  const serviceKey = await prisma.serviceKey.create({
    data: {
      serviceId,
      apiKey: hashedApiKey,
      name: serviceName,
      permissions,
      webhookUrl,
      isActive: true,
      rateLimitPerHour,
      rateLimitPerDay,
    },
  });

  printHeader('Service Key Created');
  console.log('Save this API key now; it cannot be shown again from the database.');
  console.log(`X-Service-Id: ${serviceKey.serviceId}`);
  console.log(`X-Service-Key: ${apiKey}`);
  console.log(`Name: ${serviceKey.name}`);
  console.log(`Permissions: ${JSON.stringify(permissions)}`);
  console.log(`Rate Limits: ${rateLimitPerHour}/hour, ${rateLimitPerDay}/day`);

  const saveChoice = await question('Save credentials to file? [y/N]: ');
  if (saveChoice.toLowerCase() === 'y') {
    const defaultFile = `${serviceName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-key.txt`;
    const filePath = (await question(`Output file path (default: ${defaultFile}): `)) || defaultFile;

    const payload = [
      `X-Service-Id: ${serviceKey.serviceId}`,
      `X-Service-Key: ${apiKey}`,
      `Name: ${serviceKey.name}`,
      `Permissions: ${JSON.stringify(permissions)}`,
    ].join('\n');

    fs.writeFileSync(filePath, payload, { encoding: 'utf8' });
    console.log(`Credentials written to: ${filePath}`);
  }

  printHeader('Integration Example');
  console.log(
    `curl -H "X-Service-Key: ${apiKey}" -H "X-Service-Id: ${serviceKey.serviceId}" http://localhost:8001/api/internal/v1/organizations`
  );
}

function runVerification(): void {
  printHeader('SES Production Readiness Verification');
  const result = spawnSync('node', ['scripts/verify-ses-production-readiness.js'], {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
  if (result.status !== 0) {
    throw new Error('SES production readiness verification failed.');
  }
}

async function interactiveMenu(): Promise<void> {
  printHeader('Notification Backend Production CLI');
  console.log('1. Show capabilities');
  console.log('2. Create service key');
  console.log('3. Run SES production verification');
  console.log('4. Show usage');

  const choice = await question('Choose an action [1/2/3/4] (default: 1): ');

  if (choice === '2') {
    await createServiceKeyFlow();
    return;
  }
  if (choice === '3') {
    runVerification();
    return;
  }
  if (choice === '4') {
    printUsage();
    return;
  }
  printCapabilities();
}

async function main(): Promise<void> {
  const [, , command, ...rest] = process.argv;
  const presetArg = rest.find((item) => item.startsWith('--preset='))?.split('=')[1];

  try {
    switch (command) {
      case 'help':
      case '--help':
      case '-h':
        printUsage();
        break;
      case 'capabilities':
        printCapabilities();
        break;
      case 'create-service-key':
        await createServiceKeyFlow(presetArg);
        break;
      case 'verify-production':
        runVerification();
        break;
      case undefined:
        await interactiveMenu();
        break;
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

main().catch((error) => {
  console.error(`Error: ${error.message || String(error)}`);
  process.exit(1);
});
