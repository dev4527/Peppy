import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://peppy-we0g.onrender.com', // Tumhara live Render backend link
        changeOrigin: true,
        secure: false,
      }
    }
  }
})