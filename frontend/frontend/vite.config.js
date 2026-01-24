import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import fs from 'fs'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const serverIp = env.VITE_SERVER_IP || '127.0.0.1'
  const serverPort = env.VITE_SERVER_PORT || '3000'
  const useHttps = String(env.VITE_USE_HTTPS || 'false') === 'true'
  const target = `${useHttps ? 'https' : 'http'}://${serverIp}:${serverPort}`

  return {
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    open: true,
    https: {
      key: fs.readFileSync('./localhost+3-key.pem'),
      cert: fs.readFileSync('./localhost+3.pem')
    },
    proxy: {
      '/api': {
        target,
        changeOrigin: true,
        secure: false
      },
      '/uploads': {
        target,
        changeOrigin: true,
        secure: false
      }
    }
  }
}
})
