import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import { auth } from '../../lib/auth'
import { db } from '../../lib/db'
import { users } from '@ontime/db'
import { eq } from 'drizzle-orm'

export async function createContext({ req }: FetchCreateContextFnOptions) {
  const session = await auth.api.getSession({ headers: req.headers })

  if (!session?.user?.id) {
    return { userId: null, tenantId: null, role: null, db: db() }
  }

  const [user] = await db()
    .select({ id: users.id, tenantId: users.tenantId, role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  if (!user) {
    return { userId: null, tenantId: null, role: null, db: db() }
  }

  return {
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
    db: db(),
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>
