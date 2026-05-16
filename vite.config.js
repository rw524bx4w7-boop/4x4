import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sri } from 'vite-plugin-sri3'

export default defineConfig({
  plugins: [react(), sri()],
})
