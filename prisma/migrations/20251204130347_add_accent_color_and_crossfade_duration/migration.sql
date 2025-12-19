-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UserSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "accentColor" TEXT NOT NULL DEFAULT '#a855f7',
    "defaultQuality" TEXT NOT NULL DEFAULT 'high',
    "autoPlay" BOOLEAN NOT NULL DEFAULT true,
    "crossfade" BOOLEAN NOT NULL DEFAULT false,
    "crossfadeDuration" INTEGER NOT NULL DEFAULT 3,
    "autoSaveInterval" INTEGER NOT NULL DEFAULT 300,
    "maxOfflineStorage" INTEGER NOT NULL DEFAULT 5000,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "pushNotifications" BOOLEAN NOT NULL DEFAULT true,
    "collaborationNotifications" BOOLEAN NOT NULL DEFAULT true,
    "profileVisibility" TEXT NOT NULL DEFAULT 'public',
    "showActivity" BOOLEAN NOT NULL DEFAULT true,
    "showStats" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_UserSettings" ("autoPlay", "autoSaveInterval", "collaborationNotifications", "crossfade", "defaultQuality", "emailNotifications", "id", "maxOfflineStorage", "profileVisibility", "pushNotifications", "showActivity", "showStats", "theme", "userId") SELECT "autoPlay", "autoSaveInterval", "collaborationNotifications", "crossfade", "defaultQuality", "emailNotifications", "id", "maxOfflineStorage", "profileVisibility", "pushNotifications", "showActivity", "showStats", "theme", "userId" FROM "UserSettings";
DROP TABLE "UserSettings";
ALTER TABLE "new_UserSettings" RENAME TO "UserSettings";
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
