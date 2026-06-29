import { pgTable, uuid, text, boolean, timestamp, numeric } from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { tenants } from './tenants'

export const jobSites = pgTable('job_sites', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'restrict' }),
  name: text('name').notNull(),
  erpJobNumber: text('erp_job_number'),
  erpExternalId: text('erp_external_id'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  country: text('country').default('US').notNull(),
  // PostGIS point — stored as raw SQL column, queried via sql template
  locationLat: numeric('location_lat', { precision: 10, scale: 7 }),
  locationLng: numeric('location_lng', { precision: 10, scale: 7 }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const costCodes = pgTable('cost_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'restrict' }),
  jobSiteId: uuid('job_site_id').references(() => jobSites.id, { onDelete: 'cascade' }),
  code: text('code').notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  erpExternalId: text('erp_external_id'),
})

export const jobSitesRelations = relations(jobSites, ({ one, many }) => ({
  tenant: one(tenants, { fields: [jobSites.tenantId], references: [tenants.id] }),
  costCodes: many(costCodes),
}))

export const costCodesRelations = relations(costCodes, ({ one }) => ({
  tenant: one(tenants, { fields: [costCodes.tenantId], references: [tenants.id] }),
  jobSite: one(jobSites, { fields: [costCodes.jobSiteId], references: [jobSites.id] }),
}))

export type JobSite = typeof jobSites.$inferSelect
export type NewJobSite = typeof jobSites.$inferInsert
export type CostCode = typeof costCodes.$inferSelect
export type NewCostCode = typeof costCodes.$inferInsert
