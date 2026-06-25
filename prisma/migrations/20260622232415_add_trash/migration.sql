-- AlterTable
ALTER TABLE "Instance" ADD COLUMN     "trashRetentionDays" INTEGER NOT NULL DEFAULT 90;

-- AlterTable
ALTER TABLE "Media" ADD COLUMN     "deletedAt" TIMESTAMP(3);
