import { pgTable, uuid, text, boolean, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { tenants } from './tenants'
import { jobSites } from './jobSites'

export const geofenceTriggerEnum = pgEnum('geofence_trigger', ['enter', 'exit', 'both'])
export const geofenceActionEnum = pgEnum('geofence_action', ['prompt', 'auto_clock', 'notify'])

export const geofences = pgTable('geofences', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'restrict' }),
  jobSiteId: uuid('job_site_id')
    .notNull()
    .references(() => jobSites.id, { onDelete: 'cascade' }),
  name: text('name').notNull().default('Main'),
  // GeoJSON polygon stored as text; PostGIS geometry column added via raw migration
  boundaryGeoJson: text('boundary_geo_json'),
  // Centroid + radius stored for native OS geofencing on mobile
  centerLat: text('center_lat'),
  centerLng: text('center_lng'),
  radiusMeters: integer('radius_meters').default(100).notNull(),
  trigger: geofenceTriggerEnum('trigger').default('both').notNull(),
  action: geofenceActionEnum('action').default('prompt').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const geofencesRelations = relations(geofences, ({ one }) => ({
  tenant: one(tenants, { fields: [geofences.tenantId], references: [tenants.id] }),
  jobSite: one(jobSites, { fields: [geofences.jobSiteId], references: [jobSites.id] }),
}))

export type Geofence = typeof geofences.$inferSelect
export type NewGeofence = typeof geofences.$inferInsert
