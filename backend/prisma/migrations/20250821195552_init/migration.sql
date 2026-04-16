-- CreateEnum
CREATE TYPE "public"."OrgStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "public"."DomainStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "public"."VerificationMethod" AS ENUM ('DNS_TXT', 'CNAME');

-- CreateEnum
CREATE TYPE "public"."TemplateCategory" AS ENUM ('TRANSACTIONAL', 'MARKETING', 'SYSTEM');

-- CreateEnum
CREATE TYPE "public"."EmailPriority" AS ENUM ('HIGH', 'NORMAL', 'LOW');

-- CreateEnum
CREATE TYPE "public"."EmailStatus" AS ENUM ('QUEUED', 'PROCESSING', 'SENT', 'FAILED', 'BOUNCED', 'COMPLAINED');

-- CreateEnum
CREATE TYPE "public"."EmailEventType" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'BOUNCED', 'COMPLAINED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."WebhookStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "public"."Organization" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" "public"."OrgStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Domain" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationToken" TEXT NOT NULL,
    "dkimSelector" TEXT,
    "dkimPrivateKey" TEXT,
    "dkimPublicKey" TEXT,
    "spfRecord" TEXT,
    "dmarcRecord" TEXT,
    "verificationMethod" "public"."VerificationMethod" NOT NULL DEFAULT 'DNS_TXT',
    "verifiedAt" TIMESTAMP(3),
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "lastCheckAt" TIMESTAMP(3),
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "status" "public"."DomainStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Domain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ServiceKey" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "permissions" JSONB NOT NULL,
    "webhookUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rateLimitPerHour" INTEGER NOT NULL DEFAULT 1000,
    "rateLimitPerDay" INTEGER NOT NULL DEFAULT 10000,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmailTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "templateCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "textContent" TEXT NOT NULL,
    "requiredVariables" JSONB NOT NULL,
    "optionalVariables" JSONB NOT NULL,
    "category" "public"."TemplateCategory" NOT NULL DEFAULT 'TRANSACTIONAL',
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmailJob" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "templateId" TEXT,
    "fromEmail" TEXT NOT NULL,
    "fromName" TEXT,
    "toEmails" JSONB NOT NULL,
    "ccEmails" JSONB,
    "bccEmails" JSONB,
    "variables" JSONB NOT NULL,
    "priority" "public"."EmailPriority" NOT NULL DEFAULT 'NORMAL',
    "scheduledAt" TIMESTAMP(3),
    "status" "public"."EmailStatus" NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "lastAttemptAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "messageId" TEXT,
    "serviceKeyId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmailEvent" (
    "id" TEXT NOT NULL,
    "emailJobId" TEXT NOT NULL,
    "eventType" "public"."EmailEventType" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "EmailEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WebhookDelivery" (
    "id" TEXT NOT NULL,
    "emailJobId" TEXT NOT NULL,
    "serviceKeyId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "public"."WebhookStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "responseCode" INTEGER,
    "responseBody" TEXT,
    "nextRetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_organizationId_key" ON "public"."Organization"("organizationId");

-- CreateIndex
CREATE INDEX "Organization_organizationId_idx" ON "public"."Organization"("organizationId");

-- CreateIndex
CREATE INDEX "Organization_status_idx" ON "public"."Organization"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Domain_domain_key" ON "public"."Domain"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "Domain_verificationToken_key" ON "public"."Domain"("verificationToken");

-- CreateIndex
CREATE INDEX "Domain_organizationId_idx" ON "public"."Domain"("organizationId");

-- CreateIndex
CREATE INDEX "Domain_domain_idx" ON "public"."Domain"("domain");

-- CreateIndex
CREATE INDEX "Domain_status_idx" ON "public"."Domain"("status");

-- CreateIndex
CREATE INDEX "Domain_isPrimary_idx" ON "public"."Domain"("isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceKey_serviceId_key" ON "public"."ServiceKey"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceKey_apiKey_key" ON "public"."ServiceKey"("apiKey");

-- CreateIndex
CREATE INDEX "ServiceKey_apiKey_idx" ON "public"."ServiceKey"("apiKey");

-- CreateIndex
CREATE INDEX "ServiceKey_serviceId_idx" ON "public"."ServiceKey"("serviceId");

-- CreateIndex
CREATE INDEX "ServiceKey_isActive_idx" ON "public"."ServiceKey"("isActive");

-- CreateIndex
CREATE INDEX "EmailTemplate_organizationId_idx" ON "public"."EmailTemplate"("organizationId");

-- CreateIndex
CREATE INDEX "EmailTemplate_templateCode_idx" ON "public"."EmailTemplate"("templateCode");

-- CreateIndex
CREATE INDEX "EmailTemplate_isActive_idx" ON "public"."EmailTemplate"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_organizationId_templateCode_version_key" ON "public"."EmailTemplate"("organizationId", "templateCode", "version");

-- CreateIndex
CREATE INDEX "EmailJob_organizationId_idx" ON "public"."EmailJob"("organizationId");

-- CreateIndex
CREATE INDEX "EmailJob_status_idx" ON "public"."EmailJob"("status");

-- CreateIndex
CREATE INDEX "EmailJob_createdAt_idx" ON "public"."EmailJob"("createdAt");

-- CreateIndex
CREATE INDEX "EmailJob_scheduledAt_idx" ON "public"."EmailJob"("scheduledAt");

-- CreateIndex
CREATE INDEX "EmailEvent_emailJobId_idx" ON "public"."EmailEvent"("emailJobId");

-- CreateIndex
CREATE INDEX "EmailEvent_eventType_idx" ON "public"."EmailEvent"("eventType");

-- CreateIndex
CREATE INDEX "EmailEvent_timestamp_idx" ON "public"."EmailEvent"("timestamp");

-- CreateIndex
CREATE INDEX "WebhookDelivery_emailJobId_idx" ON "public"."WebhookDelivery"("emailJobId");

-- CreateIndex
CREATE INDEX "WebhookDelivery_status_idx" ON "public"."WebhookDelivery"("status");

-- CreateIndex
CREATE INDEX "WebhookDelivery_nextRetryAt_idx" ON "public"."WebhookDelivery"("nextRetryAt");

-- AddForeignKey
ALTER TABLE "public"."Domain" ADD CONSTRAINT "Domain_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmailTemplate" ADD CONSTRAINT "EmailTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmailJob" ADD CONSTRAINT "EmailJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmailJob" ADD CONSTRAINT "EmailJob_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."EmailTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmailJob" ADD CONSTRAINT "EmailJob_serviceKeyId_fkey" FOREIGN KEY ("serviceKeyId") REFERENCES "public"."ServiceKey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmailEvent" ADD CONSTRAINT "EmailEvent_emailJobId_fkey" FOREIGN KEY ("emailJobId") REFERENCES "public"."EmailJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_emailJobId_fkey" FOREIGN KEY ("emailJobId") REFERENCES "public"."EmailJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_serviceKeyId_fkey" FOREIGN KEY ("serviceKeyId") REFERENCES "public"."ServiceKey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
