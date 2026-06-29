import { pgTable, uuid, text, boolean, timestamp, numeric, pgEnum } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { tenants } from './tenants'
import { users } from './users'

export const payTypeEnum = pgEnum('pay_type', ['hourly', 'salary', 'piece_rate'])

export const employees = pgTable('employees', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'restrict' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  employeeNumber: text('employee_number'),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  payType: payTypeEnum('pay_type').default('hourly').notNull(),
  hourlyRate: numeric('hourly_rate', { precision: 10, scale: 4 }),
  defaultCostCode: text('default_cost_code'),
  isActive: boolean('is_active').default(true).notNull(),
  erpExternalId: text('erp_external_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const employeesRelations = relations(employees, ({ one }) => ({
  tenant: one(tenants, { fields: [employees.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [employees.userId], references: [users.id] }),
}))

export type Employee = typeof employees.$inferSelect
export type NewEmployee = typeof employees.$inferInsert
