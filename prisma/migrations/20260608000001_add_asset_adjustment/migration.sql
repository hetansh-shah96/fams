-- CreateEnum
CREATE TYPE "AdjustmentType" AS ENUM ('REVALUATION_UP', 'REVALUATION_DOWN', 'COST_CORRECTION', 'PARTIAL_WRITE_OFF');

-- CreateTable
CREATE TABLE "AssetAdjustment" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "type" "AdjustmentType" NOT NULL,
    "adjustmentDate" TIMESTAMP(3) NOT NULL,
    "previousCost" DECIMAL(15,2) NOT NULL,
    "adjustmentAmount" DECIMAL(15,2) NOT NULL,
    "newCost" DECIMAL(15,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "approvedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetAdjustment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AssetAdjustment" ADD CONSTRAINT "AssetAdjustment_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetAdjustment" ADD CONSTRAINT "AssetAdjustment_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
