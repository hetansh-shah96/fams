/*
  Warnings:

  - You are about to drop the column `itActBlockRate` on the `AssetCategory` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "AssignedToType" AS ENUM ('USER', 'OFFICE');

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "assignedToType" "AssignedToType" NOT NULL DEFAULT 'OFFICE',
ADD COLUMN     "customValues" JSONB,
ADD COLUMN     "itActBlockId" TEXT;

-- AlterTable
ALTER TABLE "AssetCategory" DROP COLUMN "itActBlockRate",
ADD COLUMN     "customFields" JSONB,
ADD COLUMN     "group" TEXT,
ADD COLUMN     "isIntangible" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Location" ADD COLUMN     "companyId" TEXT;

-- CreateTable
CREATE TABLE "ItActBlock" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItActBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ItActBlock_code_key" ON "ItActBlock"("code");

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_itActBlockId_fkey" FOREIGN KEY ("itActBlockId") REFERENCES "ItActBlock"("id") ON DELETE SET NULL ON UPDATE CASCADE;
