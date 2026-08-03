import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  // El `@/` de los imports. Está declarado en tsconfig para el editor, pero
  // Vite necesita el suyo aparte: sin esto `npm run dev` no levanta.
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: { host: true, port: 5173 },
})
