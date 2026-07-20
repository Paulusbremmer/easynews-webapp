import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['easynews.bossdwarf.win'],
    proxy: {
      '/api': 'http://127.0.0.1:3002',
      '/stream': 'http://127.0.0.1:3002',
      '/vlc.m3u': 'http://127.0.0.1:3002',
      '/vlc-proxy': 'http://127.0.0.1:3002',
      '/vlc-android': 'http://127.0.0.1:3002',
      '/vlc-app': 'http://127.0.0.1:3002',
      '/windows-vlc.reg': 'http://127.0.0.1:3002'
    }
  }
})
