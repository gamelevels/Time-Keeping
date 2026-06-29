import { pgTable, uuid, text, boolean, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const planEnum = pgEnum('plan', ['starter', 'pro', 'enterprise'])

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  plan: planEnum('plan').default('starter').notNull(),
  themeConfig: jsonb('theme_config').$type<{
    primaryColor?: string
    logoUrl?: string
    appName?: string
  }>(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type Tenant = typeof tenants.$inferSelect
export type NewTenant = typeof tenants.$inferInsert
