import { pgTable, bigserial, uuid, timestamp, real, smallint } from 'drizzle-orm/pg-core'
import { numeric } from 'drizzle-orm/pg-core'

// High-volume table: partitioned monthly by recorded_at in production.
// Partition DDL is in drizzle/migrations/0002_gps_partitions.sql (manual).
// 90-day retention enforced by pg_cron dropping old partitions.
export const gpsBreadcrumbs = pgTable('gps_breadcrumbs', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  employeeId: uuid('employee_id').notNull(),
  timeEntryId: uuid('time_entry_id'),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
  lat: numeric('lat', { precision: 10, scale: 7 }).notNull(),
  lng: numeric('lng', { precision: 10, scale: 7 }).notNull(),
  accuracy: real('accuracy'),
  speed: real('speed'),
  batteryLevel: smallint('battery_level'),
  localId: uuid('local_id'),
})

export type GpsBreadcrumb = typeof gpsBreadcrumbs.$inferSelect
export type NewGpsBreadcrumb = typeof gpsBreadcrumbs.$inferInsert
