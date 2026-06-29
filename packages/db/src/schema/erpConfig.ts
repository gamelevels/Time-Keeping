import { pgTable, uuid, text, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { tenants } from './tenants'

export const erpAdapterTypeEnum = pgEnum('erp_adapter_type', [
  'spectrum',
  'procore',
  'sage',
  'quickbooks',
  'adp',
  'csv',
  'none',
])

export const erpRoleEnum = pgEnum('erp_role', ['source', 'sink', 'both'])

export const erpSyncStatusEnum = pgEnum('erp_sync_status', [
  'idle',
  'running',
  'success',
  'error',
])

export const erpConfigs = pgTable('erp_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  adapterType: erpAdapterTypeEnum('adapter_type').notNull(),
  role: erpRoleEnum('role').default('both').notNull(),
  // Credentials encrypted at rest with AES-256-GCM via app layer
  credentials: jsonb('credentials').$type<Record<string, string>>().default({}).notNull(),
  // Adapter-specific settings (company_id, field mappings, etc.)
  config: jsonb('config').$type<Record<string, unknown>>().default({}).notNull(),
  lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
  syncStatus: erpSyncStatusEnum('sync_status').default('idle').notNull(),
  syncError: text('sync_error'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const erpConfigsRelations = relations(erpConfigs, ({ one }) => ({
  tenant: one(tenants, { fields: [erpConfigs.tenantId], references: [tenants.id] }),
}))

export type ErpConfig = typeof erpConfigs.$inferSelect
export type NewErpConfig = typeof erpConfigs.$inferInsert
