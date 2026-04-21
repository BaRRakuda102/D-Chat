import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',  // Важно для production!
  server: {
    port: 80,
    host: true
  },
  build: {
    outDir: 'dist'
  }
})