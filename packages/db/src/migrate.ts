import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function runMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL ?? 'postgresql://ontime:ontime@localhost:5432/ontime',
  })

  const db = drizzle(pool)

  console.log('Running migrations...')
  await migrate(db, { migrationsFolder: path.join(__dirname, '../drizzle') })
  console.log('Migrations complete.')

  await pool.end()
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
