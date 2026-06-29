import { z } from 'zod'
import { router, protectedProcedure, managerProcedure, adminProcedure } from './trpc'
import { createJobSiteSchema, upsertGeofenceSchema } from '@ontime/validators'
import { jobSites, costCodes, geofences } from '@ontime/db'
import { eq, and, asc, sql } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'

export const jobSitesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(jobSites)
      .where(and(eq(jobSites.tenantId, ctx.tenantId), eq(jobSites.isActive, true)))
      .orderBy(asc(jobSites.name))
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [site] = await ctx.db
        .select()
        .from(jobSites)
        .where(and(eq(jobSites.id, input.id), eq(jobSites.tenantId, ctx.tenantId)))
        .limit(1)

      if (!site) throw new TRPCError({ code: 'NOT_FOUND' })

      const codes = await ctx.db
        .select()
        .from(costCodes)
        .where(and(eq(costCodes.jobSiteId, site.id), eq(costCodes.isActive, true)))

      return { ...site, costCodes: codes }
    }),

  create: adminProcedure
    .input(createJobSiteSchema)
    .mutation(async ({ ctx, input }) => {
      const [site] = await ctx.db
        .insert(jobSites)
        .values({
          tenantId: ctx.tenantId,
          name: input.name,
          erpJobNumber: input.erpJobNumber ?? null,
          address: input.address ?? null,
          city: input.city ?? null,
          state: input.state ?? null,
          country: input.country,
          locationLat: input.location ? String(input.location.lat) : null,
          locationLng: input.location ? String(input.location.lng) : null,
        })
        .returning()

      if (!site) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      return site
    }),

  upsertGeofence: adminProcedure
    .input(upsertGeofenceSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify job site belongs to tenant
      const [site] = await ctx.db
        .select({ id: jobSites.id })
        .from(jobSites)
        .where(and(eq(jobSites.id, input.jobSiteId), eq(jobSites.tenantId, ctx.tenantId)))
        .limit(1)

      if (!site) throw new TRPCError({ code: 'NOT_FOUND' })

      // Compute approximate centroid + bounding radius for native OS geofencing
      const coords = input.geoJson.coordinates[0] ?? []
      const lngs = coords.map(([lng]) => lng)
      const lats = coords.map(([, lat]) => lat)
      const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2
      const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2

      // Rough bounding radius in meters (Haversine approximation)
      const maxDist = Math.max(
        ...coords.map(([lng, lat]) => {
          const dLat = ((lat - centerLat) * Math.PI) / 180
          const dLng = ((lng - centerLng) * Math.PI) / 180
          return Math.sqrt(dLat * dLat + dLng * dLng) * 6371000
        }),
      )

      const existing = await ctx.db
        .select({ id: geofences.id })
        .from(geofences)
        .where(
          and(
            eq(geofences.jobSiteId, input.jobSiteId),
            eq(geofences.name, input.name),
            eq(geofences.tenantId, ctx.tenantId),
          ),
        )
        .limit(1)

      if (existing[0]) {
        const [updated] = await ctx.db
          .update(geofences)
          .set({
            boundaryGeoJson: JSON.stringify(input.geoJson),
            centerLat: String(centerLat),
            centerLng: String(centerLng),
            radiusMeters: Math.ceil(maxDist),
            trigger: input.trigger,
            action: input.action,
          })
          .where(eq(geofences.id, existing[0].id))
          .returning()
        return updated
      }

      const [created] = await ctx.db
        .insert(geofences)
        .values({
          tenantId: ctx.tenantId,
          jobSiteId: input.jobSiteId,
          name: input.name,
          boundaryGeoJson: JSON.stringify(input.geoJson),
          centerLat: String(centerLat),
          centerLng: String(centerLng),
          radiusMeters: Math.ceil(maxDist),
          trigger: input.trigger,
          action: input.action,
        })
        .returning()

      return created
    }),

  listGeofences: protectedProcedure
    .input(z.object({ jobSiteId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(geofences)
        .where(
          and(
            eq(geofences.jobSiteId, input.jobSiteId),
            eq(geofences.tenantId, ctx.tenantId),
            eq(geofences.isActive, true),
          ),
        )
    }),

  // Returns all active geofences for the tenant (used by mobile for OS-level geofencing)
  allGeofences: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: geofences.id,
        jobSiteId: geofences.jobSiteId,
        name: geofences.name,
        centerLat: geofences.centerLat,
        centerLng: geofences.centerLng,
        radiusMeters: geofences.radiusMeters,
        trigger: geofences.trigger,
        action: geofences.action,
        boundaryGeoJson: geofences.boundaryGeoJson,
      })
      .from(geofences)
      .where(
        and(eq(geofences.tenantId, ctx.tenantId), eq(geofences.isActive, true)),
      )
  }),
})
