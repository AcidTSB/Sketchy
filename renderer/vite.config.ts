import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'inject-electron-bridge',
      transformIndexHtml(html) {
        // Inject inline script that creates window.electronAPI
        // This runs BEFORE any React code
        return html.replace(
          '</head>',
          `<script>
            (function() {
              if (typeof window !== 'undefined' && !window.electronAPI) {
                try {
                  const { ipcRenderer } = require('electron');
                  window.electronAPI = {
                    createProject: (p) => ipcRenderer.invoke('create-project', p),
                    getProjects: () => ipcRenderer.invoke('get-projects'),
                    getProject: (id) => ipcRenderer.invoke('get-project', id),
                    updateProject: (id, p) => ipcRenderer.invoke('update-project', id, p),
                    deleteProject: (id) => ipcRenderer.invoke('delete-project', id),
                    getFolders: (pid) => ipcRenderer.invoke('get-folders', pid),
                    createFolder: (p) => ipcRenderer.invoke('create-folder', p),
                    updateFolder: (id, name) => ipcRenderer.invoke('update-folder', id, name),
                    deleteFolder: (id) => ipcRenderer.invoke('delete-folder', id),
                    importFiles: (p) => ipcRenderer.invoke('import-files', p),
                    cancelImport: (id) => ipcRenderer.invoke('cancel-import', id),
                    onImportProgress: (cb) => {
                      const l = (_, d) => cb(d);
                      ipcRenderer.on('import-progress', l);
                      return () => ipcRenderer.removeListener('import-progress', l);
                    },
                    getTracks: (pid, fid) => ipcRenderer.invoke('get-tracks', pid, fid),
                    getTrack: (id) => ipcRenderer.invoke('get-track', id),
                    updateTrack: (id, p) => ipcRenderer.invoke('update-track', id, p),
                    deleteTrack: (id) => ipcRenderer.invoke('delete-track', id),
                    moveTrack: (id, fid) => ipcRenderer.invoke('move-track', id, fid),
                    getFileVersions: (id) => ipcRenderer.invoke('get-file-versions', id),
                    setLatestVersion: (tid, vid) => ipcRenderer.invoke('set-latest-version', tid, vid),
                    deleteFileVersion: (id) => ipcRenderer.invoke('delete-file-version', id),
                    getFilePath: (id) => ipcRenderer.invoke('get-file-path', id),
                    extractMetadata: (p) => ipcRenderer.invoke('extract-metadata', p),
                    getTags: () => ipcRenderer.invoke('get-tags'),
                    createTag: (p) => ipcRenderer.invoke('create-tag', p),
                    addTagToTrack: (p) => ipcRenderer.invoke('add-tag-to-track', p),
                    removeTagFromTrack: (tid, tagid) => ipcRenderer.invoke('remove-tag-from-track', tid, tagid),
                    getNotes: (id) => ipcRenderer.invoke('get-notes', id),
                    createNote: (p) => ipcRenderer.invoke('create-note', p),
                    updateNote: (id, p) => ipcRenderer.invoke('update-note', id, p),
                    deleteNote: (id) => ipcRenderer.invoke('delete-note', id),
                    getShareLinks: () => ipcRenderer.invoke('get-share-links'),
                    getShareLink: (t) => ipcRenderer.invoke('get-share-link', t),
                    createShareLink: (p) => ipcRenderer.invoke('create-share-link', p),
                    verifyShareLinkPassword: (t, pw) => ipcRenderer.invoke('verify-share-link-password', t, pw),
                    revokeShareLink: (id) => ipcRenderer.invoke('revoke-share-link', id),
                    deleteShareLink: (id) => ipcRenderer.invoke('delete-share-link', id),
                    getSharedContent: (t) => ipcRenderer.invoke('get-shared-content', t),
                    getCurrentUser: () => ipcRenderer.invoke('get-current-user'),
                    updateUserProfile: (p) => ipcRenderer.invoke('update-user-profile', p),
                    uploadAvatar: (p) => ipcRenderer.invoke('upload-avatar', p),
                    getSettings: () => ipcRenderer.invoke('get-settings'),
                    updateSettings: (p) => ipcRenderer.invoke('update-settings', p),
                    logout: () => ipcRenderer.invoke('logout'),
                    minimize: () => ipcRenderer.send('window-minimize'),
                    maximize: () => ipcRenderer.send('window-maximize'),
                    close: () => ipcRenderer.send('window-close'),
                  };
                } catch (err) {
                  console.error('[vite-plugin] ❌ Failed:', err);
                }
              }
            })();
          </script></head>`
        )
      },
    },
  ],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
})
