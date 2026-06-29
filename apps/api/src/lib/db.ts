import { getDb, withTenantTx } from '@ontime/db'
import type { Database } from '@ontime/db'

let _db: Database | null = null

export function db(): Database {
  if (!_db) {
    _db = getDb()
  }
  return _db
}

export { withTenantTx }
export type { Database }
