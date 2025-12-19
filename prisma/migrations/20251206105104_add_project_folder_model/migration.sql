-- CreateTable
CREATE TABLE "ProjectFolder" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "coverArt" TEXT,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectFolder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Project" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "projectFolderId" INTEGER,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "coverArt" TEXT,
    "bpm" INTEGER,
    "musicalKey" TEXT,
    "mood" TEXT,
    "genre" TEXT,
    "notesJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Project_projectFolderId_fkey" FOREIGN KEY ("projectFolderId") REFERENCES "ProjectFolder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("bpm", "coverArt", "createdAt", "description", "genre", "id", "mood", "musicalKey", "name", "notesJson", "updatedAt", "userId") SELECT "bpm", "coverArt", "createdAt", "description", "genre", "id", "mood", "musicalKey", "name", "notesJson", "updatedAt", "userId" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE INDEX "Project_userId_idx" ON "Project"("userId");
CREATE INDEX "Project_projectFolderId_idx" ON "Project"("projectFolderId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ProjectFolder_userId_idx" ON "ProjectFolder"("userId");
