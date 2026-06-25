-- AlterTable
ALTER TABLE "Media" ADD COLUMN "contentHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Media_userId_contentHash_key" ON "Media"("userId", "contentHash");
