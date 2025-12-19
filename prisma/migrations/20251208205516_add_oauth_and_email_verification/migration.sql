/*
  Warnings:

  - You are about to drop the `ProjectFolder` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `projectFolderId` on the `Project` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "ProjectFolder_userId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ProjectFolder";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Project" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
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
    CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("bpm", "coverArt", "createdAt", "description", "genre", "id", "mood", "musicalKey", "name", "notesJson", "updatedAt", "userId") SELECT "bpm", "coverArt", "createdAt", "description", "genre", "id", "mood", "musicalKey", "name", "notesJson", "updatedAt", "userId" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE INDEX "Project_userId_idx" ON "Project"("userId");
CREATE TABLE "new_UserProfile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "bio" TEXT,
    "location" TEXT,
    "website" TEXT,
    "avatar" TEXT,
    "googleId" TEXT,
    "authProvider" TEXT NOT NULL DEFAULT 'local',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationToken" TEXT,
    "verificationTokenExpiry" DATETIME,
    "resetToken" TEXT,
    "resetTokenExpiry" DATETIME,
    "totalProjects" INTEGER NOT NULL DEFAULT 0,
    "totalTracks" INTEGER NOT NULL DEFAULT 0,
    "totalPlays" INTEGER NOT NULL DEFAULT 0,
    "followers" INTEGER NOT NULL DEFAULT 0,
    "following" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_UserProfile" ("avatar", "bio", "createdAt", "email", "followers", "following", "id", "location", "name", "password", "totalPlays", "totalProjects", "totalTracks", "updatedAt", "website") SELECT "avatar", "bio", "createdAt", "email", "followers", "following", "id", "location", "name", "password", "totalPlays", "totalProjects", "totalTracks", "updatedAt", "website" FROM "UserProfile";
DROP TABLE "UserProfile";
ALTER TABLE "new_UserProfile" RENAME TO "UserProfile";
CREATE UNIQUE INDEX "UserProfile_email_key" ON "UserProfile"("email");
CREATE UNIQUE INDEX "UserProfile_googleId_key" ON "UserProfile"("googleId");
CREATE UNIQUE INDEX "UserProfile_verificationToken_key" ON "UserProfile"("verificationToken");
CREATE UNIQUE INDEX "UserProfile_resetToken_key" ON "UserProfile"("resetToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
