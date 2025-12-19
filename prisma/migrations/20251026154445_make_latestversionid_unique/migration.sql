/*
  Warnings:

  - A unique constraint covering the columns `[latestVersionId]` on the table `Track` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Track_latestVersionId_key" ON "Track"("latestVersionId");
