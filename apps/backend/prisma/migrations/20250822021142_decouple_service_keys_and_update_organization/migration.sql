/*
  Warnings:

  - You are about to drop the column `organizationId` on the `ServiceKey` table. All the data in the column will be lost.
  - Added the required column `email` to the `Organization` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Organization` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."ServiceKey" DROP CONSTRAINT "ServiceKey_organizationId_fkey";

-- DropIndex
DROP INDEX "public"."ServiceKey_organizationId_idx";

-- AlterTable
ALTER TABLE "public"."Organization" ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "metadata" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "settings" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "webhookSecret" TEXT,
ADD COLUMN     "webhookUrl" TEXT;

-- AlterTable
ALTER TABLE "public"."ServiceKey" DROP COLUMN "organizationId";
