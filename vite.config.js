import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://service.pgskorea.co.kr/scada',
        changeOrigin: true,
        secure: false,
        ws: true,
      }
    }
  }
})
