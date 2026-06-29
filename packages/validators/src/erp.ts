import { z } from 'zod'

export const erpAdapterTypeSchema = z.enum([
  'spectrum',
  'procore',
  'sage',
  'quickbooks',
  'adp',
  'csv',
  'none',
])

export const erpRoleSchema = z.enum(['source', 'sink', 'both'])

export const createErpConfigSchema = z.object({
  adapterType: erpAdapterTypeSchema,
  role: erpRoleSchema.default('both'),
  credentials: z.record(z.string()).default({}),
  config: z.record(z.unknown()).default({}),
})

export type ErpAdapterType = z.infer<typeof erpAdapterTypeSchema>
export type ErpRole = z.infer<typeof erpRoleSchema>
export type CreateErpConfigInput = z.infer<typeof createErpConfigSchema>
