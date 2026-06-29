import { z } from 'zod'

export const clockInSchema = z.object({
  jobSiteId: z.string().uuid().optional(),
  costCodeId: z.string().uuid().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  accuracy: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
  source: z.enum(['mobile_manual', 'mobile_geofence', 'web_manual']).default('mobile_manual'),
})

export const clockOutSchema = z.object({
  timeEntryId: z.string().uuid(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  accuracy: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
})

export const updateTimeEntrySchema = z.object({
  id: z.string().uuid(),
  jobSiteId: z.string().uuid().optional(),
  costCodeId: z.string().uuid().optional(),
  clockInAt: z.coerce.date().optional(),
  clockOutAt: z.coerce.date().optional(),
  notes: z.string().max(500).optional(),
})

export const listTimesheetsSchema = z.object({
  employeeId: z.string().uuid().optional(),
  jobSiteId: z.string().uuid().optional(),
  status: z.enum(['active', 'pending_approval', 'approved', 'rejected', 'exported']).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(200).default(50),
})

export const gpsBatchSchema = z.object({
  entries: z.array(z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    accuracy: z.number().min(0).optional(),
    speed: z.number().optional(),
    batteryLevel: z.number().int().min(0).max(100).optional(),
    recordedAt: z.coerce.date(),
    timeEntryId: z.string().uuid().optional(),
    localId: z.string(),
  })).max(500),
})

export type ClockInInput = z.infer<typeof clockInSchema>
export type ClockOutInput = z.infer<typeof clockOutSchema>
export type UpdateTimeEntryInput = z.infer<typeof updateTimeEntrySchema>
export type ListTimesheetsInput = z.infer<typeof listTimesheetsSchema>
export type GpsBatchInput = z.infer<typeof gpsBatchSchema>
