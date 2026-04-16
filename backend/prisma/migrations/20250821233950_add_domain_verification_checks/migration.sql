/*
  Warnings:

  - You are about to drop the column `dmarcRecord` on the `Domain` table. All the data in the column will be lost.
  - You are about to drop the column `spfRecord` on the `Domain` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."CheckStatus" AS ENUM ('PENDING', 'CHECKING', 'PASSED', 'FAILED', 'WARNING');

-- AlterTable
ALTER TABLE "public"."Domain" DROP COLUMN "dmarcRecord",
DROP COLUMN "spfRecord",
ADD COLUMN     "bounceSubdomain" TEXT NOT NULL DEFAULT 'bounce',
ADD COLUMN     "returnPathDomain" TEXT,
ADD COLUMN     "spfInclude" TEXT;

-- CreateTable
CREATE TABLE "public"."DomainVerificationCheck" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "checkType" TEXT NOT NULL,
    "recordName" TEXT NOT NULL,
    "expectedValue" TEXT NOT NULL,
    "actualValue" TEXT,
    "status" "public"."CheckStatus" NOT NULL DEFAULT 'PENDING',
    "lastCheckedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DomainVerificationCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DomainVerificationCheck_domainId_idx" ON "public"."DomainVerificationCheck"("domainId");

-- CreateIndex
CREATE INDEX "DomainVerificationCheck_status_idx" ON "public"."DomainVerificationCheck"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DomainVerificationCheck_domainId_checkType_key" ON "public"."DomainVerificationCheck"("domainId", "checkType");

-- AddForeignKey
ALTER TABLE "public"."DomainVerificationCheck" ADD CONSTRAINT "DomainVerificationCheck_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "public"."Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;
