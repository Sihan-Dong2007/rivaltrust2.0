import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/groq': {
          target: 'https://api.groq.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/groq/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.removeHeader('authorization')
              proxyReq.setHeader('Authorization', `Bearer ${env.GROQ_API_KEY}`)
            })
          },
        },
        '/api/elevenlabs': {
          target: 'https://api.elevenlabs.io',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/elevenlabs/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.removeHeader('xi-api-key')
              proxyReq.setHeader('xi-api-key', env.ELEVENLABS_API_KEY)
            })
          },
        },
      },
    },
  }
})
