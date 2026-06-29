export interface ERPJobSite {
  externalId: string
  name: string
  jobNumber: string
  address?: string
  lat?: number
  lng?: number
  isActive: boolean
}

export interface ERPEmployee {
  externalId: string
  employeeNumber: string
  firstName: string
  lastName: string
  email?: string
  defaultCostCode?: string
}

export interface ERPCostCode {
  externalId: string
  jobSiteExternalId: string
  code: string
  description: string
}

export interface ERPTimeEntry {
  employeeExternalId: string
  jobSiteExternalId: string
  costCodeExternalId?: string
  clockInAt: Date
  clockOutAt: Date
  regularMinutes: number
  overtimeMinutes: number
  doubletimeMinutes: number
  notes?: string
}

export type ERPSyncResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; retryable: boolean }

export interface ERPAdapter {
  readonly adapterType: 'spectrum' | 'procore' | 'sage' | 'quickbooks' | 'adp' | 'csv' | 'none'
  readonly role: 'source' | 'sink' | 'both'

  listJobSites(since?: Date): Promise<ERPSyncResult<ERPJobSite[]>>
  listEmployees(since?: Date): Promise<ERPSyncResult<ERPEmployee[]>>
  listCostCodes(jobSiteExternalId: string): Promise<ERPSyncResult<ERPCostCode[]>>
  pushTimeEntries(
    entries: ERPTimeEntry[],
  ): Promise<ERPSyncResult<{ pushed: number; failed: number }>>
  testConnection(): Promise<ERPSyncResult<{ message: string }>>
  handleWebhook?(payload: unknown): Promise<void>
}
