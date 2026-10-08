import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/__teal': 'http://localhost:8080',
      '/terminal': {
        target: 'http://localhost:8080',
        ws: true,
      },
      '/jupyter': {
        target: 'http://localhost:8080',
        ws: true,
      },
    },
  },
})
