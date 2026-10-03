import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import publicTestFiles from './config/public-test-files.json'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
    include: publicTestFiles,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      reporter: ['text-summary', 'json-summary', 'lcov', 'html'],
      exclude: ['coverage/**', 'dist/**', 'e2e/**', 'netlify/**', 'scripts/**', 'src/tests/**', '**/*.test.{ts,tsx,mjs}', '**/*.config.{ts,mjs}'],
    },
  },
})
