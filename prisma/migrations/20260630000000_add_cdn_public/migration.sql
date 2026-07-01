-- AlterTable
ALTER TABLE "Media" ADD COLUMN "cdnPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "cdnToken" TEXT;

-- AlterTable
ALTER TABLE "Instance" ADD COLUMN "s3PublicBucket" TEXT,
ADD COLUMN "cdnPublicBaseUrl" TEXT;
