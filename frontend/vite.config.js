import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // "@/…" = src/…, used by the shadcn/ui components (components.json)
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
})
