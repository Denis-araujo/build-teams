import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // wrangler pages dev (Pages Functions) escuta em 8788 por padrão
    proxy: { '/api': 'http://localhost:8788' },
  },
})
