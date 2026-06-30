import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { auth } from './lib/auth'
import { appRouter } from './routers/trpc/_router'
import { createContext } from './routers/trpc/context'
import { sseRouter } from './routers/sse'
import { gpsRouter } from './routers/gps'
import { env } from './env'

const app = new Hono()

// Middleware
app.use('*', logger())
app.use(
  '*',
  cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:19006',
      ...(env.CORS_ORIGIN ? env.CORS_ORIGIN.split(',').map((o) => o.trim()) : []),
    ],
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  }),
)

// Health check
app.get('/api/health', (c) =>
  c.json({ status: 'ok', version: '0.1.0', timestamp: new Date().toISOString() }),
)

// better-auth handler
app.all('/api/auth/*', (c) => auth.handler(c.req.raw))

// tRPC handler
app.all('/api/trpc/*', (c) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req: c.req.raw,
    router: appRouter,
    createContext,
    onError: ({ error, path }) => {
      if (error.code === 'INTERNAL_SERVER_ERROR') {
        console.error(`[tRPC] Error on ${path}:`, error)
      }
    },
  }),
)

// SSE live dashboard
app.route('/api', sseRouter)

// GPS breadcrumb ingestion
app.route('/api/gps', gpsRouter)

// 404 fallback
app.notFound((c) => c.json({ error: 'Not found' }, 404))

const port = env.PORT ?? env.API_PORT
const host = env.API_HOST

console.log(`OnTime API starting on http://${host}:${port}`)

export default {
  port,
  hostname: host,
  fetch: app.fetch,
}
