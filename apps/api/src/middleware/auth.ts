import { createMiddleware } from 'hono/factory'
import { auth } from '../lib/auth'
import { db } from '../lib/db'
import { users } from '@ontime/db'
import { eq } from 'drizzle-orm'

export const authMiddleware = createMiddleware<{
  Variables: { userId: string; tenantId: string; role: string; sessionId: string }
}>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })

  if (!session?.user?.id) {
    c.res = c.json({ error: 'Unauthorized' }, 401)
    return
  }

  const [user] = await db()
    .select({
      id: users.id,
      tenantId: users.tenantId,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  if (!user) {
    c.res = c.json({ error: 'User not found' }, 401)
    return
  }

  c.set('userId', user.id)
  c.set('tenantId', user.tenantId)
  c.set('role', user.role)
  c.set('sessionId', session.session.id)

  await next()
})

export const requireRole = (...roles: string[]) =>
  createMiddleware<{
    Variables: { userId: string; tenantId: string; role: string; sessionId: string }
  }>(async (c, next) => {
    const role = c.get('role')
    if (!roles.includes(role)) {
      c.res = c.json({ error: 'Forbidden' }, 403)
      return
    }
    await next()
  })
