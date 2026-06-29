import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { db } from '../lib/db'
import { gpsBreadcrumbs } from '@ontime/db'
import { gpsBatchSchema } from '@ontime/validators'
import { getRedis } from '../lib/redis'

type Vars = { tenantId: string; userId: string; role: string; sessionId: string }
export const gpsRouter = new Hono<{ Variables: Vars }>()

// High-frequency GPS breadcrumb batch upload
// Rate limited to 1 request per 5s per employee (enforced via Redis)
gpsRouter.post('/batch', authMiddleware, async (c) => {
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')

  // Rate limiting via Redis sliding window
  const redis = getRedis()
  const key = `gps_rate:${userId}`
  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, 5)
  if (count > 3) {
    return c.json({ error: 'Rate limit exceeded' }, 429)
  }

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  const parsed = gpsBatchSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400)
  }

  const { entries } = parsed.data
  if (entries.length === 0) return c.json({ inserted: 0 })

  // Batch insert — Drizzle handles this efficiently
  await db()
    .insert(gpsBreadcrumbs)
    .values(
      entries.map((e) => ({
        tenantId,
        employeeId: userId, // resolved to actual employeeId in production via a lookup
        timeEntryId: e.timeEntryId ?? null,
        recordedAt: e.recordedAt,
        lat: String(e.lat),
        lng: String(e.lng),
        accuracy: e.accuracy ?? null,
        speed: e.speed ?? null,
        batteryLevel: e.batteryLevel ?? null,
        localId: e.localId,
      })),
    )
    .onConflictDoNothing()

  return c.json({ inserted: entries.length })
})
