# Audio Project Manager

Desktop application for managing audio projects with versioning, playback, and organization features.

## Features

- 📁 Project and folder organization
- 🎵 Audio file import (MP3, WAV, FLAC, etc.)
- 📝 File versioning with metadata tracking
- ▶️ Built-in audio player with waveform visualization
- 🏷️ Tags and notes for tracks
- 💾 Two storage modes: Copy or Reference
- 🔒 Offline-only, local storage

## Tech Stack

- **Electron** - Desktop application framework
- **React + TypeScript** - UI framework
- **Vite** - Build tool
- **Prisma + SQLite** - Database ORM
- **WaveSurfer.js** - Audio waveform visualization
- **Zustand** - State management
- **TailwindCSS** - Styling

## Prerequisites

- Node.js 18+ (with pnpm)
- Windows/macOS/Linux
- **Python 3.8+** (required for stem separation feature)

## Setup & Installation

### 1. Install dependencies

```bash
pnpm install
```

### 2. Generate Prisma client

```bash
pnpm prisma:generate
```

### 3. Run database migrations

```bash
pnpm prisma:migrate
```

### 4. (Optional) Setup Stem Separation

To use the AI-powered stem separation feature (split vocals, drums, bass, other):

**Quick check:**

```bash
# Check if Demucs is installed
pnpm check:demucs

# Or run the batch file (Windows)
check-demucs.bat
```

**Install Demucs:**

```bash
# Option 1: Use npm script (recommended)
pnpm install:demucs

# Option 2: Manual installation
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
pip install demucs
```

**Troubleshooting:**

- If you get error code `3221225477` (Access Violation), see [STEM_SEPARATION_SETUP.md](STEM_SEPARATION_SETUP.md) for detailed fix.
- Common issue: Missing Visual C++ Redistributables (Windows)
- Requirements: Python 3.8+, 8GB+ RAM recommended

## Development

### Run the desktop app (Recommended)

```bash
pnpm dev
```

This will:

- Start the Vite dev server on http://localhost:5173
- Compile and watch Electron main process
- **Launch the Electron desktop app automatically**

> ⚠️ **Important**: This is a **desktop application**. While you can view the UI at http://localhost:5173, most features (create projects, import audio, database access) will NOT work in the browser. Always use the Electron app window.

### View database

```bash
pnpm prisma:studio
```

### Seed database with sample data

```bash
pnpm db:seed
```

## Building

### Build for production

```bash
pnpm build
```

### Package installers

```bash
# All platforms (current OS)
pnpm package

# Windows only
pnpm package:win

# macOS only
pnpm package:mac

# Linux only
pnpm package:linux
```

Installers will be created in the `dist/` directory.

## Testing

### Run unit tests

```bash
pnpm test:unit
```

### Run E2E tests

```bash
pnpm e2e
```

## Project Structure

```
/
├── electron/              # Electron main process
│   ├── src/
│   │   ├── main.ts       # Main entry point
│   │   ├── preload.ts    # Preload script (IPC bridge)
│   │   ├── ipc/          # IPC handlers
│   │   │   ├── project.ipc.ts
│   │   │   ├── import.ipc.ts
│   │   │   ├── playback.ipc.ts
│   │   │   ├── tags-notes.ipc.ts
│   │   │   └── schemas.ts  # Zod validation schemas
│   │   ├── db/           # Database client
│   │   ├── workers/      # Background workers
│   │   │   └── importWorker.ts
│   │   └── utils/        # Utilities
│
├── renderer/             # React frontend
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── pages/        # Page components
│   │   ├── components/   # Reusable components
│   │   ├── store/        # Zustand store
│   │   └── types/        # TypeScript types
│
├── prisma/
│   └── schema.prisma     # Database schema
│
└── tests/
    ├── unit/             # Unit tests
    └── e2e/              # E2E tests
```

## Usage

### Creating a Project

1. Click "New Project" on the home screen
2. Enter project name and optional description
3. Click "Create"

### Importing Audio Files

1. Open a project
2. Click "Import Files"
3. Choose storage mode:
   - **Copy** (recommended): Files are copied to app storage
   - **Reference**: App stores path reference only
4. Drag & drop audio files or use file picker
5. Click "Import"

### Playing Audio

1. Click on any track in the project
2. Use the player controls:
   - Play/Pause
   - Skip forward/backward (10 seconds)
   - Click waveform to seek

### Managing Tags & Notes

(To be implemented in UI)

## API Documentation

The Electron API is exposed via `window.electronAPI` with full TypeScript support.

### Projects

```typescript
// Get all projects
await window.electronAPI.getProjects()

// Create project
await window.electronAPI.createProject({ name: 'My Project', description: '...' })

// Update project
await window.electronAPI.updateProject(id, { name: 'Updated' })

// Delete project
await window.electronAPI.deleteProject(id)
```

### Import

```typescript
// Import files
const { importId } = await window.electronAPI.importFiles({
  projectId: 1,
  folderId: 2,
  files: [{ path: '/path/to/file.mp3', name: 'file.mp3' }],
  storageMode: 'copy',
})

// Listen for progress
const unsubscribe = window.electronAPI.onImportProgress((data) => {
  console.log(data.file, data.progress, data.status)
})
```

See `renderer/src/types/electron.d.ts` for full API reference.

## Configuration

### Database Location

SQLite database is stored at:

- **Windows**: `%APPDATA%/AudioProjectManager/prisma/dev.db`
- **macOS**: `~/Library/Application Support/AudioProjectManager/prisma/dev.db`
- **Linux**: `~/.config/AudioProjectManager/prisma/dev.db`

### Logs

Application logs are stored at:

- **Windows**: `%APPDATA%/AudioProjectManager/logs/`
- **macOS**: `~/Library/Application Support/AudioProjectManager/logs/`
- **Linux**: `~/.config/AudioProjectManager/logs/`

## Troubleshooting

### Database issues

Reset the database:

```bash
rm -rf prisma/dev.db
pnpm prisma:migrate
```

### Build issues

Clean and rebuild:

```bash
rm -rf node_modules electron/dist renderer/dist
pnpm install
pnpm build
```

## Contributing

1. Follow the TypeScript strict mode guidelines
2. Use Zod schemas for all IPC validation
3. Write unit tests for new features
4. Run `pnpm lint` before committing

## License

MIT

## Roadmap

- [ ] Trim/Export audio clips
- [ ] AI-powered audio separation (stems)
- [ ] Cloud sync
- [ ] Collaboration features
- [ ] Plugin system
- [ ] VST/AU plugin support

## Support

For issues or questions, please open an issue on GitHub.
