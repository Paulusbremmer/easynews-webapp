import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['easynews.bossdwarf.win'],
    proxy: {
      '^/(api|stream|vlc\\.m3u|vlc-proxy|vlc-android|vlc-app|vlc-redirect|windows-vlc\\.reg)': {
        target: 'http://127.0.0.1:3002',
        xfwd: true
      }
    }
  }
})
