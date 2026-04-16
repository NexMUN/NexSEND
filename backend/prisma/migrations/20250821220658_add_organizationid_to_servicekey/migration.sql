/*
  Warnings:

  - Added the required column `organizationId` to the `ServiceKey` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."ServiceKey" ADD COLUMN     "organizationId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "ServiceKey_organizationId_idx" ON "public"."ServiceKey"("organizationId");

-- AddForeignKey
ALTER TABLE "public"."ServiceKey" ADD CONSTRAINT "ServiceKey_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
