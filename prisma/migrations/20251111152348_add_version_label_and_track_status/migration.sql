-- AlterTable
ALTER TABLE "FileVersion" ADD COLUMN "label" TEXT;

-- AlterTable
ALTER TABLE "Track" ADD COLUMN "status" TEXT DEFAULT 'draft';
