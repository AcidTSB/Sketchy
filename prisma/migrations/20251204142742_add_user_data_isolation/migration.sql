/*
  Warnings:

  - You are about to drop the `AnalyticsSummary` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "AnalyticsSummary_userId_date_period_key";

-- DropIndex
DROP INDEX "AnalyticsSummary_userId_period_date_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "AnalyticsSummary";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "DailyAnalytics" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "period" TEXT NOT NULL,
    "projectsCreated" INTEGER NOT NULL DEFAULT 0,
    "tracksImported" INTEGER NOT NULL DEFAULT 0,
    "tracksPlayed" INTEGER NOT NULL DEFAULT 0,
    "playTimeSeconds" INTEGER NOT NULL DEFAULT 0,
    "exportsCount" INTEGER NOT NULL DEFAULT 0,
    "storageUsedMB" REAL NOT NULL DEFAULT 0,
    "filesImported" INTEGER NOT NULL DEFAULT 0,
    "sessionsCount" INTEGER NOT NULL DEFAULT 0,
    "avgSessionMins" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DailyAnalytics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ActivityLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" INTEGER,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ActivityLog" ("action", "createdAt", "entityId", "entityType", "id", "metadata", "userId") SELECT "action", "createdAt", "entityId", "entityType", "id", "metadata", "userId" FROM "ActivityLog";
DROP TABLE "ActivityLog";
ALTER TABLE "new_ActivityLog" RENAME TO "ActivityLog";
CREATE INDEX "ActivityLog_userId_createdAt_idx" ON "ActivityLog"("userId", "createdAt");
CREATE INDEX "ActivityLog_action_idx" ON "ActivityLog"("action");
CREATE TABLE "new_PlayHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "trackId" INTEGER NOT NULL,
    "projectId" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "playedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlayHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PlayHistory" ("completed", "duration", "id", "playedAt", "projectId", "trackId", "userId") SELECT "completed", "duration", "id", "playedAt", "projectId", "trackId", "userId" FROM "PlayHistory";
DROP TABLE "PlayHistory";
ALTER TABLE "new_PlayHistory" RENAME TO "PlayHistory";
CREATE INDEX "PlayHistory_userId_playedAt_idx" ON "PlayHistory"("userId", "playedAt");
CREATE INDEX "PlayHistory_trackId_idx" ON "PlayHistory"("trackId");
CREATE INDEX "PlayHistory_projectId_idx" ON "PlayHistory"("projectId");
CREATE TABLE "new_Project" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL DEFAULT 1,
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
INSERT INTO "new_Project" ("bpm", "coverArt", "createdAt", "description", "genre", "id", "mood", "musicalKey", "name", "notesJson", "updatedAt") SELECT "bpm", "coverArt", "createdAt", "description", "genre", "id", "mood", "musicalKey", "name", "notesJson", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE INDEX "Project_userId_idx" ON "Project"("userId");
CREATE TABLE "new_UserSession" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "durationMins" REAL,
    "actionsCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_UserSession" ("actionsCount", "durationMins", "endedAt", "id", "startedAt", "userId") SELECT "actionsCount", "durationMins", "endedAt", "id", "startedAt", "userId" FROM "UserSession";
DROP TABLE "UserSession";
ALTER TABLE "new_UserSession" RENAME TO "UserSession";
CREATE INDEX "UserSession_userId_startedAt_idx" ON "UserSession"("userId", "startedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "DailyAnalytics_userId_period_date_idx" ON "DailyAnalytics"("userId", "period", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyAnalytics_userId_date_period_key" ON "DailyAnalytics"("userId", "date", "period");
