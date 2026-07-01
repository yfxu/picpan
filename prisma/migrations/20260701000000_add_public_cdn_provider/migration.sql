-- AlterTable
ALTER TABLE "Instance" ADD COLUMN "s3PublicEndpoint" TEXT,
ADD COLUMN "s3PublicRegion" TEXT,
ADD COLUMN "s3PublicAccessKey" TEXT,
ADD COLUMN "s3PublicSecretKey" TEXT,
ADD COLUMN "s3PublicProvider" TEXT;
