import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function generateApiKey(): Promise<string> {
  //return crypto.randomBytes(32).toString('hex');
  return '9ee3bca93425820442368670c63978314d67a3d0e1c68905722eca2ba7847ae1';
}

async function hashApiKey(apiKey: string): Promise<string> {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clean existing data
  await prisma.webhookDelivery.deleteMany();
  await prisma.emailEvent.deleteMany();
  await prisma.emailJob.deleteMany();
  await prisma.emailTemplate.deleteMany();
  await prisma.domainVerificationCheck.deleteMany();
  await prisma.domain.deleteMany();
  await prisma.serviceKey.deleteMany();
  await prisma.organization.deleteMany();

  // Create test organization
  const testOrg = await prisma.organization.create({
    data: {
      name: 'Test Organization',
      organizationId: 'org_test_123',
      email: 'admin@test.org',
      status: 'ACTIVE',
      settings: {},
      metadata: {},
    },
  });

  console.log('✅ Created test organization:', testOrg.id);

  // Create service key (no longer tied to organization)
  const apiKey = await generateApiKey();
  const hashedApiKey = await hashApiKey(apiKey);

  const serviceKey = await prisma.serviceKey.create({
    data: {
      serviceId: 'service_test_123',
      apiKey: hashedApiKey,
      name: 'Test Backend Service',
      permissions: {
        organizations: ['*'],
        domains: ['manage'],
        emails: ['send', 'read'],
      },
      webhookUrl: 'http://localhost:3000/webhooks/email',
      isActive: true,
      rateLimitPerHour: 1000,
      rateLimitPerDay: 10000,
    },
  });

  console.log('✅ Created service key:', serviceKey.id);
  console.log('📋 API Key (save this, it cannot be retrieved later):', apiKey);

  // Create test domain
  const domain = await prisma.domain.create({
    data: {
      organizationId: testOrg.id,
      domain: 'test.example.com',
      verificationToken: crypto.randomBytes(16).toString('hex'),
      isPrimary: true,
      status: 'PENDING',
    },
  });

  console.log('✅ Created test domain:', domain.domain);

  // Create email templates
  const welcomeTemplate = await prisma.emailTemplate.create({
    data: {
      organizationId: testOrg.id,
      templateCode: 'WELCOME_EMAIL',
      name: 'Welcome Email',
      subject: 'Welcome to {{appName}}, {{firstName}}!',
      htmlContent: `
        <h1>Welcome {{firstName}}!</h1>
        <p>Thank you for joining {{appName}}.</p>
        <p>Get started by <a href="{{ctaLink}}">clicking here</a>.</p>
      `,
      textContent: `
        Welcome {{firstName}}!
        
        Thank you for joining {{appName}}.
        
        Get started by visiting: {{ctaLink}}
      `,
      requiredVariables: ['firstName', 'appName', 'ctaLink'],
      optionalVariables: ['lastName'],
      category: 'TRANSACTIONAL',
      version: 1,
      isActive: true,
      createdBy: serviceKey.serviceId,
    },
  });

  const passwordResetTemplate = await prisma.emailTemplate.create({
    data: {
      organizationId: testOrg.id,
      templateCode: 'PASSWORD_RESET',
      name: 'Password Reset',
      subject: 'Reset your password',
      htmlContent: `
        <h2>Password Reset Request</h2>
        <p>Hi {{firstName}},</p>
        <p>We received a request to reset your password.</p>
        <p><a href="{{resetLink}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
        <p>This link will expire in {{expiryHours}} hours.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
      textContent: `
        Password Reset Request
        
        Hi {{firstName}},
        
        We received a request to reset your password.
        
        Reset your password: {{resetLink}}
        
        This link will expire in {{expiryHours}} hours.
        
        If you didn't request this, please ignore this email.
      `,
      requiredVariables: ['firstName', 'resetLink', 'expiryHours'],
      optionalVariables: [],
      category: 'TRANSACTIONAL',
      version: 1,
      isActive: true,
      createdBy: serviceKey.serviceId,
    },
  });

  console.log('✅ Created email templates:', [welcomeTemplate.name, passwordResetTemplate.name]);

  console.log('\n🎉 Database seeding completed successfully!');
  console.log('\n📝 Important information:');
  console.log(`- Organization ID: ${testOrg.organizationId}`);
  console.log(`- Service ID: ${serviceKey.serviceId}`);
  console.log(`- API Key: ${apiKey}`);
  console.log(`- Test Domain: ${domain.domain}`);
  console.log('\n⚠️  Save the API key securely, it cannot be retrieved later!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });