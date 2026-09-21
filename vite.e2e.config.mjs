import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

const personaContext = fileURLToPath(new URL('./e2e/support/PersonaAssessmentContext.tsx', import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^\.\/context\/AssessmentContext$/, replacement: personaContext },
      { find: /^\.\.\/context\/AssessmentContext$/, replacement: personaContext },
    ],
  },
})
