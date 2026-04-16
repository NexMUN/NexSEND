#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const path = require('path');

require('ts-node/register/transpile-only');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function must(condition, message) {
  assert.ok(condition, message);
}

async function verifySesCredentialsPath() {
  const { SESProvider } = require('../src/modules/email/providers/ses.provider');

  const configService = {
    get: (key, defaultValue) => {
      const map = {
        AWS_REGION: 'eu-north-1',
        AWS_ACCESS_KEY_ID: 'x',
        AWS_SECRET_ACCESS_KEY: 'y',
      };
      return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : defaultValue;
    },
  };

  const provider = new SESProvider(configService);
  provider.sesClient = { send: async () => ({}) };
  const ok = await provider.verifyCredentials();
  must(ok === true, 'SES credentials verification path failed');
}

async function verifyQueuePath() {
  const { EmailProcessor } = require('../src/modules/email/processors/email.processor');

  let called = false;
  const emailService = {
    sendDirectEmail: async (data) => {
      called = true;
      must(data.id === 'job-1', 'Queue payload id mismatch');
    },
  };

  const processor = new EmailProcessor(emailService);
  await processor.handleSendEmail({
    id: 'job-1',
    attemptsMade: 0,
    data: {
      id: 'job-1',
      organizationId: 'org-1',
      to: 'user@example.com',
      subject: 'test',
    },
  });

  must(called, 'Queue processor did not invoke sendDirectEmail');
}

function verifyHealthPath() {
  const { HealthController } = require('../src/modules/health/health.controller');
  const controller = new HealthController();
  const response = controller.check();

  must(response.status === 'ok', 'Health endpoint status is not ok');
  must(response.service === 'notification-backend', 'Health endpoint service name mismatch');
  must(typeof response.timestamp === 'string' && response.timestamp.length > 0, 'Health endpoint timestamp missing');
}

function verifySourceSurface() {
  const repoRoot = process.cwd();
  const targets = [
    path.join(repoRoot, 'src/modules/email/email.service.ts'),
    path.join(repoRoot, 'src/modules/email/factories/email-provider.factory.ts'),
    path.join(repoRoot, 'src/modules/domain/domain.service.ts'),
  ];

  for (const file of targets) {
    const text = read(file);
    must(!/SendGrid|SENDGRID|SMTP/.test(text), `Forbidden provider keyword found in ${path.basename(file)}`);
  }

  const domainService = read(path.join(repoRoot, 'src/modules/domain/domain.service.ts'));
  must(domainService.includes('SES_DOMAIN_VERIFY'), 'Domain verification flow is missing SES domain verification checks');

  const emailService = read(path.join(repoRoot, 'src/modules/email/email.service.ts'));
  must(emailService.includes('getPrimaryProvider()'), 'Email service does not use SES primary provider path');
  must(!emailService.includes('nodemailer'), 'Email service still includes SMTP nodemailer path');
}

function verifyEnvSurface() {
  const envFiles = ['.env', '.env.example', '.env.production', '.env.production.example', '.production.env'];
  for (const file of envFiles) {
    const fullPath = path.join(process.cwd(), file);
    if (!fs.existsSync(fullPath)) {
      continue;
    }
    const content = read(fullPath);
    must(/EMAIL_PROVIDER=SES/.test(content), `${file} is missing EMAIL_PROVIDER=SES`);
    must(!/(^|\n)SENDGRID_|(^|\n)SMTP_|EMAIL_PROVIDER_FALLBACKS|EMAIL_ENABLE_FALLBACK/m.test(content), `${file} contains non-SES email settings`);
  }
}

(async () => {
  verifySourceSurface();
  verifyEnvSurface();
  verifyHealthPath();
  await verifySesCredentialsPath();
  await verifyQueuePath();
  console.log('SES production-readiness verification passed');
})().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
