import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Dev-only mock of the gateway's /__teal/* endpoints so the page renders
// standalone (`bun run dev`). Only registered in serve mode; never in builds.
// Switch interface with ?iface=terminal|vscode|jupyter (read from the Referer).
function mockGateway(): Plugin {
  const files = [
    { name: 'notes', isDir: true, size: null, modified: 1760000000 },
    { name: 'src', isDir: true, size: null, modified: 1760000000 },
    { name: 'Main.hs', isDir: false, size: 1432, modified: 1760000000 },
    { name: 'README.md', isDir: false, size: 812, modified: 1760000000 },
    { name: 'data.csv', isDir: false, size: 20480, modified: 1760000000 },
  ]
  const expiresAt = new Date(Date.now() + 59 * 60 * 1000 + 11 * 1000).toISOString()
  return {
    name: 'teal-mock-gateway',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url || '/', 'http://localhost')
        if (/^\/(terminal|vscode|jupyter)(\/|$)/.test(url.pathname)) {
          res.setHeader('Content-Type', 'text/html')
          return res.end(
            '<body style="margin:0;background:#000;color:#94a3b8;font:14px monospace;padding:16px">' +
              `mock ${url.pathname} interface placeholder</body>`,
          )
        }
        if (!url.pathname.startsWith('/__teal/')) return next()
        const json = (body: unknown, status = 200) => {
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(body))
        }
        if (url.pathname === '/__teal/info') {
          const ref = new URL(req.headers.referer || 'http://localhost/')
          const iface = url.searchParams.get('iface') || ref.searchParams.get('iface') || 'terminal'
          return json({
            sessionId: 'mock-session',
            expiresAt,
            lab: {
              name: 'Functional Programming in Haskell',
              description: 'Course tools, preinstalled.',
              interface: iface,
              tools: ['GHC 9.x', 'cabal', 'git'],
              cpu: '1',
              memory: '2Gi',
            },
            dashboardUrl: '/dashboard',
          })
        }
        if (url.pathname === '/__teal/healthz') {
          res.statusCode = 200
          return res.end('ok')
        }
        if (url.pathname === '/__teal/end' && req.method === 'POST') return json({ ok: true })
        if (url.pathname.startsWith('/__teal/files')) {
          const sub = url.pathname.replace('/__teal/files', '').replace(/^\/|\/$/g, '')
          return json({ path: sub, items: sub ? files.filter((f) => !f.isDir) : files })
        }
        return json({ error: 'not_found' }, 404)
      })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const mock = command === 'serve' && process.env.TEAL_MOCK !== '0'
  return {
    plugins: [react(), ...(mock ? [mockGateway()] : [])],
    server: {
      port: 5174,
      // With the mock active, don't proxy /__teal to a (nonexistent) gateway
      proxy: {
        ...(mock ? {} : { '/__teal': 'http://localhost:8080' }),
        ...(mock
          ? {}
          : {
              '/terminal': { target: 'http://localhost:8080', ws: true },
              '/jupyter': { target: 'http://localhost:8080', ws: true },
            }),
      },
    },
  }
})
