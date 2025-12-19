import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // ĐÃ XÓA ĐOẠN PLUGIN GÂY LỖI MÀN HÌNH ĐEN
  ],
  base: './', // Bắt buộc để load tài nguyên trong file .exe
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
