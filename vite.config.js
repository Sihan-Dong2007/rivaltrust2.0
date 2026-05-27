import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { matchRespondent } from './server/anes-matcher.js'

// Vite dev plugin: serves /api/match-respondent without a separate Express process
function anesMatcherPlugin(env) {
  return {
    name: 'anes-matcher-dev',
    configureServer(server) {
      server.middlewares.use('/api/match-respondent', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const { persona_id, statement } = JSON.parse(body);
            const result = await matchRespondent(persona_id, statement, env.GROQ_API_KEY);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
          } catch (err) {
            console.error('[anes-matcher-dev]', err.message);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), anesMatcherPlugin(env)],
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
