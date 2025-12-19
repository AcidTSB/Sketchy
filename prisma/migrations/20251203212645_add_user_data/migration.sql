-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" INTEGER,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PlayHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "trackId" INTEGER NOT NULL,
    "projectId" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "playedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AnalyticsSummary" (
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
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "durationMins" REAL,
    "actionsCount" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "PopularityRank" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL,
    "playsCount" INTEGER NOT NULL DEFAULT 0,
    "lastPlayedAt" DATETIME,
    "rankScore" REAL NOT NULL DEFAULT 0,
    "period" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "ActivityLog_userId_createdAt_idx" ON "ActivityLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_action_idx" ON "ActivityLog"("action");

-- CreateIndex
CREATE INDEX "PlayHistory_userId_playedAt_idx" ON "PlayHistory"("userId", "playedAt");

-- CreateIndex
CREATE INDEX "PlayHistory_trackId_idx" ON "PlayHistory"("trackId");

-- CreateIndex
CREATE INDEX "PlayHistory_projectId_idx" ON "PlayHistory"("projectId");

-- CreateIndex
CREATE INDEX "AnalyticsSummary_userId_period_date_idx" ON "AnalyticsSummary"("userId", "period", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsSummary_userId_date_period_key" ON "AnalyticsSummary"("userId", "date", "period");

-- CreateIndex
CREATE INDEX "UserSession_userId_startedAt_idx" ON "UserSession"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "PopularityRank_entityType_period_rankScore_idx" ON "PopularityRank"("entityType", "period", "rankScore");

-- CreateIndex
CREATE UNIQUE INDEX "PopularityRank_entityType_entityId_period_key" ON "PopularityRank"("entityType", "entityId", "period");
