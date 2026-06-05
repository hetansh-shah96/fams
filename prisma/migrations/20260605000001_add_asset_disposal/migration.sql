-- CreateEnum
CREATE TYPE "DisposalMethod" AS ENUM ('SOLD', 'SCRAPPED', 'DONATED', 'WRITTEN_OFF');

-- CreateTable
CREATE TABLE "AssetDisposal" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "method" "DisposalMethod" NOT NULL,
    "disposalDate" TIMESTAMP(3) NOT NULL,
    "saleValue" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "buyerName" TEXT,
    "remarks" TEXT,
    "approvedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetDisposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssetDisposal_assetId_key" ON "AssetDisposal"("assetId");

-- AddForeignKey
ALTER TABLE "AssetDisposal" ADD CONSTRAINT "AssetDisposal_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetDisposal" ADD CONSTRAINT "AssetDisposal_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
