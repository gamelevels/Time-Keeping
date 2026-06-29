import { initTRPC, TRPCError } from '@trpc/server'
import type { Context } from './context'

const t = initTRPC.context<Context>().create()

export const router = t.router
export const publicProcedure = t.procedure

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId || !ctx.tenantId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({ ctx: { ...ctx, userId: ctx.userId, tenantId: ctx.tenantId, role: ctx.role! } })
})

export const managerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!['superadmin', 'admin', 'manager'].includes(ctx.role!)) {
    throw new TRPCError({ code: 'FORBIDDEN' })
  }
  return next({ ctx })
})

export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!['superadmin', 'admin'].includes(ctx.role!)) {
    throw new TRPCError({ code: 'FORBIDDEN' })
  }
  return next({ ctx })
})
