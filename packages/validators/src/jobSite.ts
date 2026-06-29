import { z } from 'zod'

export const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

export const createJobSiteSchema = z.object({
  name: z.string().min(1).max(200),
  erpJobNumber: z.string().max(100).optional(),
  address: z.string().max(300).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  country: z.string().length(2).default('US'),
  location: coordinatesSchema.optional(),
})

export const updateJobSiteSchema = createJobSiteSchema.partial()

export const geofencePolygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))).min(1),
})

export const upsertGeofenceSchema = z.object({
  jobSiteId: z.string().uuid(),
  name: z.string().min(1).max(100).default('Main'),
  geoJson: geofencePolygonSchema,
  trigger: z.enum(['enter', 'exit', 'both']).default('both'),
  action: z.enum(['prompt', 'auto_clock', 'notify']).default('prompt'),
})

export type CreateJobSiteInput = z.infer<typeof createJobSiteSchema>
export type UpsertGeofenceInput = z.infer<typeof upsertGeofenceSchema>
