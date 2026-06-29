import { Queue } from 'bullmq'
import { getRedis } from './redis'

const connection = { url: process.env.REDIS_URL ?? 'redis://localhost:6379' }

export const erpSyncQueue = new Queue('erp-sync', {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
})

export const payrollExportQueue = new Queue('payroll-export', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 100 },
  },
})

export const notificationQueue = new Queue('notification', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'fixed', delay: 10000 },
    removeOnComplete: { count: 200 },
  },
})

export type ErpSyncJobData = {
  tenantId: string
  erpConfigId: string
  direction: 'pull' | 'push'
}

export type PayrollExportJobData = {
  tenantId: string
  requestedById: string
  dateFrom: string
  dateTo: string
  format: 'csv' | 'xlsx'
  jobId: string
}

export type NotificationJobData = {
  tenantId: string
  type: 'clock_in_confirm' | 'clock_out_confirm' | 'approval_decision' | 'geofence_prompt'
  recipientId: string
  payload: Record<string, unknown>
}
