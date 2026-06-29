import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { authMiddleware } from '../middleware/auth'
import { createSubConnection, LIVE_CHANNEL } from '../lib/redis'

type Vars = { tenantId: string; userId: string; role: string; sessionId: string }
export const sseRouter = new Hono<{ Variables: Vars }>()

sseRouter.get('/live', authMiddleware, async (c) => {
  const tenantId = c.get('tenantId')

  return streamSSE(c, async (stream) => {
    const sub = createSubConnection()
    await sub.subscribe(LIVE_CHANNEL(tenantId))

    sub.on('message', (_channel, message) => {
      const event = JSON.parse(message) as { type: string }
      stream.writeSSE({ event: event.type, data: message }).catch(() => {})
    })

    // Keepalive ping every 30s to prevent proxies from closing idle connections
    const keepalive = setInterval(() => {
      stream.writeSSE({ event: 'ping', data: JSON.stringify({ at: new Date().toISOString() }) }).catch(() => {
        clearInterval(keepalive)
      })
    }, 30_000)

    stream.onAbort(() => {
      clearInterval(keepalive)
      sub.unsubscribe(LIVE_CHANNEL(tenantId)).catch(() => {})
      sub.disconnect()
    })

    // Keep stream open until client disconnects
    await new Promise<void>((resolve) => {
      stream.onAbort(resolve)
    })
  })
})
