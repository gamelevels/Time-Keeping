import { z } from 'zod'
import { router, protectedProcedure, managerProcedure } from './trpc'
import { clockInSchema, clockOutSchema, listTimesheetsSchema, updateTimeEntrySchema } from '@ontime/validators'
import { timeEntries, employees, jobSites, costCodes } from '@ontime/db'
import { eq, and, isNull, desc, gte, lte, asc } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { getRedis, LIVE_CHANNEL } from '../../lib/redis'

export const timesheetsRouter = router({
  clockIn: protectedProcedure
    .input(clockInSchema)
    .mutation(async ({ ctx, input }) => {
      // Resolve employee for the current user
      const [employee] = await ctx.db
        .select({ id: employees.id })
        .from(employees)
        .where(
          and(
            eq(employees.tenantId, ctx.tenantId),
            eq(employees.userId, ctx.userId),
          ),
        )
        .limit(1)

      if (!employee) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Employee profile not found' })
      }

      // Ensure no open entry already exists
      const [openEntry] = await ctx.db
        .select({ id: timeEntries.id })
        .from(timeEntries)
        .where(
          and(
            eq(timeEntries.tenantId, ctx.tenantId),
            eq(timeEntries.employeeId, employee.id),
            isNull(timeEntries.clockOutAt),
            eq(timeEntries.isDeleted, false),
          ),
        )
        .limit(1)

      if (openEntry) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Already clocked in. Clock out first.',
        })
      }

      const [entry] = await ctx.db
        .insert(timeEntries)
        .values({
          tenantId: ctx.tenantId,
          employeeId: employee.id,
          jobSiteId: input.jobSiteId ?? null,
          costCodeId: input.costCodeId ?? null,
          clockInAt: new Date(),
          clockInLat: input.lat ? String(input.lat) : null,
          clockInLng: input.lng ? String(input.lng) : null,
          clockInAccuracy: input.accuracy ?? null,
          source: input.source,
          status: 'active',
          notes: input.notes ?? null,
        })
        .returning()

      if (!entry) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })

      // Publish to SSE channel for live dashboard
      const [emp] = await ctx.db
        .select({ firstName: employees.firstName, lastName: employees.lastName })
        .from(employees)
        .where(eq(employees.id, employee.id))
        .limit(1)

      const redis = getRedis()
      await redis.publish(
        LIVE_CHANNEL(ctx.tenantId),
        JSON.stringify({
          type: 'clock_in',
          employeeId: employee.id,
          name: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown',
          jobSiteId: input.jobSiteId,
          lat: input.lat,
          lng: input.lng,
          at: entry.clockInAt,
          timeEntryId: entry.id,
        }),
      )

      return entry
    }),

  clockOut: protectedProcedure
    .input(clockOutSchema)
    .mutation(async ({ ctx, input }) => {
      const [entry] = await ctx.db
        .select()
        .from(timeEntries)
        .where(
          and(
            eq(timeEntries.id, input.timeEntryId),
            eq(timeEntries.tenantId, ctx.tenantId),
            isNull(timeEntries.clockOutAt),
            eq(timeEntries.isDeleted, false),
          ),
        )
        .limit(1)

      if (!entry) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Active time entry not found' })
      }

      const clockOutAt = new Date()
      const totalMinutes = Math.floor(
        (clockOutAt.getTime() - entry.clockInAt.getTime()) / 60_000,
      )

      const [updated] = await ctx.db
        .update(timeEntries)
        .set({
          clockOutAt,
          clockOutLat: input.lat ? String(input.lat) : null,
          clockOutLng: input.lng ? String(input.lng) : null,
          clockOutAccuracy: input.accuracy ?? null,
          totalMinutes,
          updatedAt: new Date(),
        })
        .where(eq(timeEntries.id, entry.id))
        .returning()

      const redis = getRedis()
      await redis.publish(
        LIVE_CHANNEL(ctx.tenantId),
        JSON.stringify({
          type: 'clock_out',
          employeeId: entry.employeeId,
          timeEntryId: entry.id,
          totalMinutes,
          at: clockOutAt,
        }),
      )

      return updated
    }),

  getActiveEntry: protectedProcedure.query(async ({ ctx }) => {
    const [employee] = await ctx.db
      .select({ id: employees.id })
      .from(employees)
      .where(
        and(eq(employees.tenantId, ctx.tenantId), eq(employees.userId, ctx.userId)),
      )
      .limit(1)

    if (!employee) return null

    const [entry] = await ctx.db
      .select()
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.tenantId, ctx.tenantId),
          eq(timeEntries.employeeId, employee.id),
          isNull(timeEntries.clockOutAt),
          eq(timeEntries.isDeleted, false),
        ),
      )
      .limit(1)

    return entry ?? null
  }),

  listActive: managerProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: timeEntries.id,
        employeeId: timeEntries.employeeId,
        employeeName: employees.firstName,
        employeeLastName: employees.lastName,
        jobSiteId: timeEntries.jobSiteId,
        clockInAt: timeEntries.clockInAt,
        clockInLat: timeEntries.clockInLat,
        clockInLng: timeEntries.clockInLng,
        source: timeEntries.source,
      })
      .from(timeEntries)
      .innerJoin(employees, eq(timeEntries.employeeId, employees.id))
      .where(
        and(
          eq(timeEntries.tenantId, ctx.tenantId),
          isNull(timeEntries.clockOutAt),
          eq(timeEntries.isDeleted, false),
        ),
      )
      .orderBy(asc(timeEntries.clockInAt))
  }),

  list: managerProcedure
    .input(listTimesheetsSchema)
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(timeEntries.tenantId, ctx.tenantId),
        eq(timeEntries.isDeleted, false),
      ]

      if (input.employeeId) conditions.push(eq(timeEntries.employeeId, input.employeeId))
      if (input.jobSiteId) conditions.push(eq(timeEntries.jobSiteId, input.jobSiteId))
      if (input.status) conditions.push(eq(timeEntries.status, input.status))
      if (input.dateFrom) conditions.push(gte(timeEntries.clockInAt, input.dateFrom))
      if (input.dateTo) conditions.push(lte(timeEntries.clockInAt, input.dateTo))

      const offset = (input.page - 1) * input.pageSize

      return ctx.db
        .select({
          id: timeEntries.id,
          employeeId: timeEntries.employeeId,
          firstName: employees.firstName,
          lastName: employees.lastName,
          jobSiteName: jobSites.name,
          costCodeCode: costCodes.code,
          clockInAt: timeEntries.clockInAt,
          clockOutAt: timeEntries.clockOutAt,
          totalMinutes: timeEntries.totalMinutes,
          status: timeEntries.status,
          source: timeEntries.source,
        })
        .from(timeEntries)
        .innerJoin(employees, eq(timeEntries.employeeId, employees.id))
        .leftJoin(jobSites, eq(timeEntries.jobSiteId, jobSites.id))
        .leftJoin(costCodes, eq(timeEntries.costCodeId, costCodes.id))
        .where(and(...conditions))
        .orderBy(desc(timeEntries.clockInAt))
        .limit(input.pageSize)
        .offset(offset)
    }),
})
