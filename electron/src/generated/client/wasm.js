
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  Serializable: 'Serializable'
});

exports.Prisma.ProjectScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  name: 'name',
  description: 'description',
  coverArt: 'coverArt',
  bpm: 'bpm',
  musicalKey: 'musicalKey',
  mood: 'mood',
  genre: 'genre',
  notesJson: 'notesJson',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FolderScalarFieldEnum = {
  id: 'id',
  name: 'name',
  projectId: 'projectId'
};

exports.Prisma.TrackScalarFieldEnum = {
  id: 'id',
  projectId: 'projectId',
  folderId: 'folderId',
  title: 'title',
  status: 'status',
  latestVersionId: 'latestVersionId',
  parentTrackId: 'parentTrackId',
  stemType: 'stemType',
  bpm: 'bpm',
  key: 'key',
  createdAt: 'createdAt'
};

exports.Prisma.FileVersionScalarFieldEnum = {
  id: 'id',
  trackId: 'trackId',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  label: 'label',
  originalPath: 'originalPath',
  storedPath: 'storedPath',
  storageMode: 'storageMode',
  mimeType: 'mimeType',
  sizeBytes: 'sizeBytes',
  durationMs: 'durationMs',
  checksum: 'checksum',
  metadataJson: 'metadataJson'
};

exports.Prisma.TagScalarFieldEnum = {
  id: 'id',
  name: 'name'
};

exports.Prisma.TrackTagScalarFieldEnum = {
  trackId: 'trackId',
  tagId: 'tagId'
};

exports.Prisma.NoteScalarFieldEnum = {
  id: 'id',
  trackId: 'trackId',
  content: 'content',
  createdAt: 'createdAt'
};

exports.Prisma.ShareLinkScalarFieldEnum = {
  id: 'id',
  token: 'token',
  trackId: 'trackId',
  projectId: 'projectId',
  passwordHash: 'passwordHash',
  expiresAt: 'expiresAt',
  revoked: 'revoked',
  createdAt: 'createdAt',
  cloudFileUrl: 'cloudFileUrl',
  projectName: 'projectName'
};

exports.Prisma.UserProfileScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  password: 'password',
  bio: 'bio',
  location: 'location',
  website: 'website',
  avatar: 'avatar',
  googleId: 'googleId',
  authProvider: 'authProvider',
  emailVerified: 'emailVerified',
  verificationToken: 'verificationToken',
  verificationTokenExpiry: 'verificationTokenExpiry',
  resetToken: 'resetToken',
  resetTokenExpiry: 'resetTokenExpiry',
  totalProjects: 'totalProjects',
  totalTracks: 'totalTracks',
  totalPlays: 'totalPlays',
  followers: 'followers',
  following: 'following',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserSettingsScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  theme: 'theme',
  accentColor: 'accentColor',
  defaultQuality: 'defaultQuality',
  autoPlay: 'autoPlay',
  crossfade: 'crossfade',
  crossfadeDuration: 'crossfadeDuration',
  autoSaveInterval: 'autoSaveInterval',
  maxOfflineStorage: 'maxOfflineStorage',
  emailNotifications: 'emailNotifications',
  pushNotifications: 'pushNotifications',
  collaborationNotifications: 'collaborationNotifications',
  profileVisibility: 'profileVisibility',
  showActivity: 'showActivity',
  showStats: 'showStats'
};

exports.Prisma.ProjectSnapshotScalarFieldEnum = {
  id: 'id',
  projectId: 'projectId',
  name: 'name',
  description: 'description',
  snapshotPath: 'snapshotPath',
  metadataJson: 'metadataJson',
  createdAt: 'createdAt'
};

exports.Prisma.ProjectBackupScalarFieldEnum = {
  id: 'id',
  projectId: 'projectId',
  backupPath: 'backupPath',
  sizeBytes: 'sizeBytes',
  isAutoBackup: 'isAutoBackup',
  createdAt: 'createdAt'
};

exports.Prisma.ChecklistItemScalarFieldEnum = {
  id: 'id',
  projectId: 'projectId',
  trackId: 'trackId',
  content: 'content',
  completed: 'completed',
  priority: 'priority',
  deadline: 'deadline',
  sortOrder: 'sortOrder',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CompareSessionScalarFieldEnum = {
  id: 'id',
  projectId: 'projectId',
  versionAId: 'versionAId',
  versionBId: 'versionBId',
  versionAType: 'versionAType',
  versionBType: 'versionBType',
  notes: 'notes',
  createdAt: 'createdAt'
};

exports.Prisma.ActivityLogScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  action: 'action',
  entityType: 'entityType',
  entityId: 'entityId',
  metadata: 'metadata',
  createdAt: 'createdAt'
};

exports.Prisma.PlayHistoryScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  trackId: 'trackId',
  projectId: 'projectId',
  duration: 'duration',
  completed: 'completed',
  playedAt: 'playedAt'
};

exports.Prisma.DailyAnalyticsScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  date: 'date',
  period: 'period',
  projectsCreated: 'projectsCreated',
  tracksImported: 'tracksImported',
  tracksPlayed: 'tracksPlayed',
  playTimeSeconds: 'playTimeSeconds',
  exportsCount: 'exportsCount',
  storageUsedMB: 'storageUsedMB',
  filesImported: 'filesImported',
  sessionsCount: 'sessionsCount',
  avgSessionMins: 'avgSessionMins',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserSessionScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  startedAt: 'startedAt',
  endedAt: 'endedAt',
  durationMins: 'durationMins',
  actionsCount: 'actionsCount'
};

exports.Prisma.PopularityRankScalarFieldEnum = {
  id: 'id',
  entityType: 'entityType',
  entityId: 'entityId',
  playsCount: 'playsCount',
  lastPlayedAt: 'lastPlayedAt',
  rankScore: 'rankScore',
  period: 'period',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};


exports.Prisma.ModelName = {
  Project: 'Project',
  Folder: 'Folder',
  Track: 'Track',
  FileVersion: 'FileVersion',
  Tag: 'Tag',
  TrackTag: 'TrackTag',
  Note: 'Note',
  ShareLink: 'ShareLink',
  UserProfile: 'UserProfile',
  UserSettings: 'UserSettings',
  ProjectSnapshot: 'ProjectSnapshot',
  ProjectBackup: 'ProjectBackup',
  ChecklistItem: 'ChecklistItem',
  CompareSession: 'CompareSession',
  ActivityLog: 'ActivityLog',
  PlayHistory: 'PlayHistory',
  DailyAnalytics: 'DailyAnalytics',
  UserSession: 'UserSession',
  PopularityRank: 'PopularityRank'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
