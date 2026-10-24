import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_')
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:8090',
          changeOrigin: true,
        },
        '/n8n': {
          target: env.VITE_N8N_PROXY_TARGET || 'http://localhost:5678',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/n8n/, ''),
        },
      },
    },
  }
})
