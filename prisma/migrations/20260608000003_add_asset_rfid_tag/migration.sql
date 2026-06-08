-- AlterTable
ALTER TABLE "Asset" ADD COLUMN "rfidTag" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Asset_rfidTag_key" ON "Asset"("rfidTag");
