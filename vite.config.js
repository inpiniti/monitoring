import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/scada': {
        target: 'https://service.pgskorea.co.kr',
        changeOrigin: true,
        secure: false,
        pathRewrite: { '^/api/scada': '/scada' },
        ws: true,
      }
    }
  }
})
