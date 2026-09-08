import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // Local dev/preview and the Docker image serve from "/"; only the GitHub
  // Pages build (npm run build:pages) needs the "/taggatu/" project-page
  // subpath, since Pages hosts this repo at <user>.github.io/taggatu/.
  base: mode === 'gh-pages' ? '/taggatu/' : '/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
}))
