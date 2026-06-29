import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema/index'

let _pool: Pool | null = null

function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    })
  }
  return _pool
}

export function getDb() {
  return drizzle(getPool(), { schema })
}

export type Database = ReturnType<typeof getDb>

// Wraps a transaction and always sets the RLS tenant context
export async function withTenantTx<T>(
  db: Database,
  tenantId: string,
  fn: (tx: Database) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(`SET LOCAL app.current_tenant_id = '${tenantId}'`)
    return fn(tx as unknown as Database)
  })
}
