import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import publicTestFiles from './config/public-test-files.json'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
    include: publicTestFiles,
  },
})
