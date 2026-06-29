import { z } from 'zod'

export const createEmployeeSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  employeeNumber: z.string().max(50).optional(),
  payType: z.enum(['hourly', 'salary', 'piece_rate']).default('hourly'),
  hourlyRate: z.number().min(0).max(9999).optional(),
  defaultCostCode: z.string().max(50).optional(),
})

export const updateEmployeeSchema = createEmployeeSchema.partial()

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>
