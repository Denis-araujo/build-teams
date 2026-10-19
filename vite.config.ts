import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // wrangler pages dev (Pages Functions) escuta em 8788 por padrão
    proxy: { '/api': 'http://localhost:8788' },
  },
})
