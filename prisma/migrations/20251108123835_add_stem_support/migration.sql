-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Track" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "projectId" INTEGER NOT NULL,
    "folderId" INTEGER,
    "title" TEXT NOT NULL,
    "latestVersionId" INTEGER,
    "parentTrackId" INTEGER,
    "stemType" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Track_latestVersionId_fkey" FOREIGN KEY ("latestVersionId") REFERENCES "FileVersion" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Track_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Track_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Track_parentTrackId_fkey" FOREIGN KEY ("parentTrackId") REFERENCES "Track" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Track" ("createdAt", "folderId", "id", "latestVersionId", "projectId", "title") SELECT "createdAt", "folderId", "id", "latestVersionId", "projectId", "title" FROM "Track";
DROP TABLE "Track";
ALTER TABLE "new_Track" RENAME TO "Track";
CREATE UNIQUE INDEX "Track_latestVersionId_key" ON "Track"("latestVersionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
