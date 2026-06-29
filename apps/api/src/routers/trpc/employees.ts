import { z } from 'zod'
import { router, managerProcedure, adminProcedure } from './trpc'
import { createEmployeeSchema, updateEmployeeSchema } from '@ontime/validators'
import { employees } from '@ontime/db'
import { eq, and, asc } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'

export const employeesRouter = router({
  list: managerProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(employees)
      .where(and(eq(employees.tenantId, ctx.tenantId), eq(employees.isActive, true)))
      .orderBy(asc(employees.lastName), asc(employees.firstName))
  }),

  get: managerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [employee] = await ctx.db
        .select()
        .from(employees)
        .where(and(eq(employees.id, input.id), eq(employees.tenantId, ctx.tenantId)))
        .limit(1)

      if (!employee) throw new TRPCError({ code: 'NOT_FOUND' })
      return employee
    }),

  create: adminProcedure
    .input(createEmployeeSchema)
    .mutation(async ({ ctx, input }) => {
      const [employee] = await ctx.db
        .insert(employees)
        .values({
          tenantId: ctx.tenantId,
          firstName: input.firstName,
          lastName: input.lastName,
          employeeNumber: input.employeeNumber ?? null,
          payType: input.payType,
          hourlyRate: input.hourlyRate ? String(input.hourlyRate) : null,
          defaultCostCode: input.defaultCostCode ?? null,
        })
        .returning()

      if (!employee) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      return employee
    }),

  update: adminProcedure
    .input(z.object({ id: z.string().uuid(), data: updateEmployeeSchema }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(employees)
        .set({
          ...input.data,
          hourlyRate: input.data.hourlyRate ? String(input.data.hourlyRate) : undefined,
          updatedAt: new Date(),
        })
        .where(and(eq(employees.id, input.id), eq(employees.tenantId, ctx.tenantId)))
        .returning()

      if (!updated) throw new TRPCError({ code: 'NOT_FOUND' })
      return updated
    }),

  deactivate: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(employees)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(eq(employees.id, input.id), eq(employees.tenantId, ctx.tenantId)))
    }),
})
