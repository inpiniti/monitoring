import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/scada': {
        target: 'https://service.pgskorea.co.kr',
        changeOrigin: true,
        secure: false,
        ws: true,
      }
    }
  }
})
