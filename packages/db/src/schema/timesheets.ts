import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  numeric,
  integer,
  real,
  pgEnum,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { tenants } from './tenants'
import { employees } from './employees'
import { jobSites, costCodes } from './jobSites'
import { geofences } from './geofences'
import { users } from './users'

export const timeEntrySourceEnum = pgEnum('time_entry_source', [
  'mobile_manual',
  'mobile_geofence',
  'web_manual',
  'api',
  'import',
])

export const timeEntryStatusEnum = pgEnum('time_entry_status', [
  'active',
  'pending_approval',
  'approved',
  'rejected',
  'exported',
])

export const timeEntries = pgTable('time_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'restrict' }),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'restrict' }),
  jobSiteId: uuid('job_site_id').references(() => jobSites.id, { onDelete: 'set null' }),
  costCodeId: uuid('cost_code_id').references(() => costCodes.id, { onDelete: 'set null' }),
  clockInAt: timestamp('clock_in_at', { withTimezone: true }).notNull(),
  clockOutAt: timestamp('clock_out_at', { withTimezone: true }),
  clockInLat: numeric('clock_in_lat', { precision: 10, scale: 7 }),
  clockInLng: numeric('clock_in_lng', { precision: 10, scale: 7 }),
  clockInAccuracy: real('clock_in_accuracy'),
  clockOutLat: numeric('clock_out_lat', { precision: 10, scale: 7 }),
  clockOutLng: numeric('clock_out_lng', { precision: 10, scale: 7 }),
  clockOutAccuracy: real('clock_out_accuracy'),
  clockInGeofenceId: uuid('clock_in_geofence_id').references(() => geofences.id, {
    onDelete: 'set null',
  }),
  clockOutGeofenceId: uuid('clock_out_geofence_id').references(() => geofences.id, {
    onDelete: 'set null',
  }),
  source: timeEntrySourceEnum('source').default('mobile_manual').notNull(),
  status: timeEntryStatusEnum('status').default('active').notNull(),
  notes: text('notes'),
  photoUrl: text('photo_url'),
  // Minutes computed on clock-out; not a GENERATED column so we can set manually
  totalMinutes: integer('total_minutes'),
  regularMinutes: integer('regular_minutes'),
  overtimeMinutes: integer('overtime_minutes'),
  doubletimeMinutes: integer('doubletime_minutes'),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const approvalRequests = pgTable('approval_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'restrict' }),
  timeEntryId: uuid('time_entry_id')
    .notNull()
    .references(() => timeEntries.id, { onDelete: 'cascade' }),
  requestedById: uuid('requested_by_id').references(() => users.id, { onDelete: 'set null' }),
  reviewedById: uuid('reviewed_by_id').references(() => users.id, { onDelete: 'set null' }),
  status: pgEnum('approval_status', ['pending', 'approved', 'rejected', 'recalled'])(
    'status',
  )
    .default('pending')
    .notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
})

export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  tenant: one(tenants, { fields: [timeEntries.tenantId], references: [tenants.id] }),
  employee: one(employees, { fields: [timeEntries.employeeId], references: [employees.id] }),
  jobSite: one(jobSites, { fields: [timeEntries.jobSiteId], references: [jobSites.id] }),
  costCode: one(costCodes, { fields: [timeEntries.costCodeId], references: [costCodes.id] }),
}))

export type TimeEntry = typeof timeEntries.$inferSelect
export type NewTimeEntry = typeof timeEntries.$inferInsert
export type ApprovalRequest = typeof approvalRequests.$inferSelect
