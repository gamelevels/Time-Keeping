/**
 * Bootstrap seed script for OnTime.
 * Run with: bun run scripts/seed.ts
 *
 * Creates the Price Electric tenant, admin user, demo job sites + cost codes.
 * Default admin password: OnTime2025! — change it after first login.
 */

import { Pool } from 'pg'
import { randomBytes, scrypt } from 'node:crypto'

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://ontime:ontime@localhost:5432/ontime'
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'tbarz@priceelectric.us'
const ADMIN_NAME = process.env.SEED_ADMIN_NAME ?? 'T. Barz'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'OnTime2025!'

const pool = new Pool({ connectionString: DATABASE_URL })

function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16).toString('hex')
    scrypt(
      password.normalize('NFKC'),
      salt,
      64,
      { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 },
      (err, key) => {
        if (err) reject(err)
        else resolve(`${salt}:${key.toString('hex')}`)
      },
    )
  })
}

async function seed() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // --- Tenant ---
    const tenantRes = await client.query<{ id: string }>(
      `INSERT INTO tenants (slug, name, plan, is_active)
       VALUES ('price-electric', 'Price Electric', 'pro', true)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
    )
    const tenantId = tenantRes.rows[0].id
    console.log(`✓ Tenant: Price Electric (${tenantId})`)

    // --- Admin user ---
    const existing = await client.query<{ id: string }>(
      `SELECT id FROM users WHERE email = $1 AND tenant_id = $2 LIMIT 1`,
      [ADMIN_EMAIL, tenantId],
    )

    let userId: string
    if (existing.rows.length > 0) {
      userId = existing.rows[0].id
      console.log(`  Admin user already exists (${userId}), skipping creation`)
    } else {
      const userRes = await client.query<{ id: string }>(
        `INSERT INTO users (tenant_id, email, email_verified, name, role)
         VALUES ($1, $2, true, $3, 'admin')
         RETURNING id`,
        [tenantId, ADMIN_EMAIL, ADMIN_NAME],
      )
      userId = userRes.rows[0].id

      // Create better-auth credential account (same format as better-auth internals)
      const passwordHash = await hashPassword(ADMIN_PASSWORD)
      await client.query(
        `INSERT INTO accounts (user_id, account_id, provider_id, password)
         VALUES ($1, $2, 'credential', $3)`,
        [userId, ADMIN_EMAIL, passwordHash],
      )
      console.log(`✓ Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`)
    }

    // --- Employee record for admin ---
    await client.query(
      `INSERT INTO employees (tenant_id, user_id, first_name, last_name, pay_type, is_active)
       VALUES ($1, $2, $3, $4, 'salary', true)
       ON CONFLICT DO NOTHING`,
      [tenantId, userId, ADMIN_NAME.split(' ')[0], ADMIN_NAME.split(' ')[1] ?? ''],
    )

    // --- Job sites ---
    const sites = [
      {
        name: 'Riverside Commercial Complex',
        jobNumber: 'PE-2025-001',
        address: '1200 Riverside Dr',
        city: 'Spokane',
        state: 'WA',
        lat: '47.6587',
        lng: '-117.4156',
        codes: [
          { code: '01-100', desc: 'General Conditions' },
          { code: '16-100', desc: 'Electrical Rough-In' },
          { code: '16-200', desc: 'Electrical Finish' },
          { code: '16-500', desc: 'Lighting Fixtures' },
        ],
      },
      {
        name: 'Northgate Industrial Park',
        jobNumber: 'PE-2025-002',
        address: '8500 N Industrial Blvd',
        city: 'Spokane',
        state: 'WA',
        lat: '47.7212',
        lng: '-117.4089',
        codes: [
          { code: '01-100', desc: 'General Conditions' },
          { code: '16-100', desc: 'Electrical Rough-In' },
          { code: '16-300', desc: 'Panel / Switchgear' },
          { code: '16-400', desc: 'Service & Grounding' },
        ],
      },
      {
        name: 'Valley Medical Clinic',
        jobNumber: 'PE-2025-003',
        address: '3215 S Regal St',
        city: 'Spokane Valley',
        state: 'WA',
        lat: '47.6321',
        lng: '-117.3512',
        codes: [
          { code: '01-100', desc: 'General Conditions' },
          { code: '16-100', desc: 'Electrical Rough-In' },
          { code: '16-600', desc: 'Emergency / Life Safety' },
          { code: '16-700', desc: 'Low Voltage / Data' },
        ],
      },
    ]

    for (const site of sites) {
      const siteRes = await client.query<{ id: string }>(
        `INSERT INTO job_sites
           (tenant_id, name, erp_job_number, address, city, state, location_lat, location_lng, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [tenantId, site.name, site.jobNumber, site.address, site.city, site.state, site.lat, site.lng],
      )
      if (siteRes.rows.length === 0) {
        console.log(`  Job site "${site.name}" already exists, skipping`)
        continue
      }
      const siteId = siteRes.rows[0].id

      for (const code of site.codes) {
        await client.query(
          `INSERT INTO cost_codes (tenant_id, job_site_id, code, description, is_active)
           VALUES ($1, $2, $3, $4, true)
           ON CONFLICT DO NOTHING`,
          [tenantId, siteId, code.code, code.desc],
        )
      }
      console.log(`✓ Job site: ${site.name} (${site.jobNumber}) with ${site.codes.length} cost codes`)
    }

    await client.query('COMMIT')
    console.log('\nSeed complete. OnTime is ready.')
    console.log(`\nLogin: ${ADMIN_EMAIL}`)
    console.log(`Password: ${ADMIN_PASSWORD}`)
    console.log('Change the password after first login!\n')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Seed failed:', err)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

seed()
