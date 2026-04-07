import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api': {
        target: 'http://backend:45678',
        changeOrigin: true
      },
      '/ws': {
        target: 'ws://backend:45678',
        ws: true
      }
    }
  }
})
