-- AlterTable
ALTER TABLE "Asset" ADD COLUMN "splitFromId" TEXT;

-- CreateTable
CREATE TABLE "AssetSplit" (
    "id" TEXT NOT NULL,
    "parentAssetId" TEXT NOT NULL,
    "splitDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "childCount" INTEGER NOT NULL,
    "approvedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetSplit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssetSplit_parentAssetId_key" ON "AssetSplit"("parentAssetId");

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_splitFromId_fkey" FOREIGN KEY ("splitFromId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetSplit" ADD CONSTRAINT "AssetSplit_parentAssetId_fkey" FOREIGN KEY ("parentAssetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetSplit" ADD CONSTRAINT "AssetSplit_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
