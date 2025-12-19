/*
  Warnings:

  - Added the required column `password` to the `UserProfile` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UserProfile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "bio" TEXT,
    "location" TEXT,
    "website" TEXT,
    "avatar" TEXT,
    "totalProjects" INTEGER NOT NULL DEFAULT 0,
    "totalTracks" INTEGER NOT NULL DEFAULT 0,
    "totalPlays" INTEGER NOT NULL DEFAULT 0,
    "followers" INTEGER NOT NULL DEFAULT 0,
    "following" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
-- Insert with default password (bcrypt hash of "password")
INSERT INTO "new_UserProfile" ("avatar", "bio", "createdAt", "email", "followers", "following", "id", "location", "name", "totalPlays", "totalProjects", "totalTracks", "updatedAt", "website", "password") 
SELECT "avatar", "bio", "createdAt", "email", "followers", "following", "id", "location", "name", "totalPlays", "totalProjects", "totalTracks", "updatedAt", "website", '$2b$10$rKxGZV.qJZGZQqVQqVqVqeX3sJZQqVQqVQqVQqVQqVQqVQqVQq' FROM "UserProfile";
DROP TABLE "UserProfile";
ALTER TABLE "new_UserProfile" RENAME TO "UserProfile";
CREATE UNIQUE INDEX "UserProfile_email_key" ON "UserProfile"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
