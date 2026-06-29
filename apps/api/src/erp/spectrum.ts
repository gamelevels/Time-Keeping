import type {
  ERPAdapter,
  ERPJobSite,
  ERPEmployee,
  ERPCostCode,
  ERPTimeEntry,
  ERPSyncResult,
} from './interface'

// Trimble Spectrum ERP adapter.
// Spectrum exposes a REST API at {baseUrl}/api/v1/...
// Authentication: API key passed as X-Api-Key header.
// Contact Trimble for partner API access: https://www.trimble.com/spectrum
type SpectrumConfig = {
  baseUrl: string
  companyId?: string
}

type SpectrumCredentials = {
  apiKey: string
}

export class SpectrumAdapter implements ERPAdapter {
  readonly adapterType = 'spectrum' as const
  readonly role: 'source' | 'sink' | 'both'
  private credentials: SpectrumCredentials
  private config: SpectrumConfig

  constructor(credentials: Record<string, string>, config: Record<string, unknown>) {
    this.role = (config.role as 'source' | 'sink' | 'both') ?? 'both'
    this.credentials = { apiKey: credentials['apiKey'] ?? '' }
    this.config = {
      baseUrl: (config.baseUrl as string) ?? '',
      companyId: config.companyId as string | undefined,
    }
  }

  private async fetch<T>(path: string, options?: RequestInit): Promise<ERPSyncResult<T>> {
    try {
      const url = `${this.config.baseUrl}${path}`
      const res = await fetch(url, {
        ...options,
        headers: {
          'X-Api-Key': this.credentials.apiKey,
          'Content-Type': 'application/json',
          ...(this.config.companyId ? { 'X-Company-Id': this.config.companyId } : {}),
          ...options?.headers,
        },
      })
      if (!res.ok) {
        const retryable = res.status >= 500 || res.status === 429
        return { ok: false, error: `HTTP ${res.status}: ${await res.text()}`, retryable }
      }
      const data = (await res.json()) as T
      return { ok: true, data }
    } catch (e) {
      return { ok: false, error: String(e), retryable: true }
    }
  }

  async testConnection(): Promise<ERPSyncResult<{ message: string }>> {
    const result = await this.fetch<{ status: string }>('/api/v1/ping')
    if (result.ok) {
      return { ok: true, data: { message: 'Connected to Trimble Spectrum' } }
    }
    return { ok: false, error: result.error, retryable: result.retryable }
  }

  async listJobSites(since?: Date): Promise<ERPSyncResult<ERPJobSite[]>> {
    const query = since ? `?updatedSince=${since.toISOString()}` : ''
    const result = await this.fetch<{ jobs: SpectrumJob[] }>(`/api/v1/jobs${query}`)
    if (!result.ok) return result

    const sites: ERPJobSite[] = result.data.jobs.map((j) => ({
      externalId: String(j.jobId),
      name: j.description,
      jobNumber: j.jobNumber,
      address: j.address,
      isActive: j.status === 'A',
    }))
    return { ok: true, data: sites }
  }

  async listEmployees(since?: Date): Promise<ERPSyncResult<ERPEmployee[]>> {
    const query = since ? `?updatedSince=${since.toISOString()}` : ''
    const result = await this.fetch<{ employees: SpectrumEmployee[] }>(
      `/api/v1/employees${query}`,
    )
    if (!result.ok) return result

    const employees: ERPEmployee[] = result.data.employees.map((e) => ({
      externalId: String(e.employeeId),
      employeeNumber: e.employeeNumber,
      firstName: e.firstName,
      lastName: e.lastName,
      email: e.email,
    }))
    return { ok: true, data: employees }
  }

  async listCostCodes(jobSiteExternalId: string): Promise<ERPSyncResult<ERPCostCode[]>> {
    const result = await this.fetch<{ costCodes: SpectrumCostCode[] }>(
      `/api/v1/jobs/${jobSiteExternalId}/cost-codes`,
    )
    if (!result.ok) return result

    const codes: ERPCostCode[] = result.data.costCodes.map((c) => ({
      externalId: String(c.costCodeId),
      jobSiteExternalId,
      code: c.code,
      description: c.description,
    }))
    return { ok: true, data: codes }
  }

  async pushTimeEntries(
    entries: ERPTimeEntry[],
  ): Promise<ERPSyncResult<{ pushed: number; failed: number }>> {
    let pushed = 0
    let failed = 0

    for (const entry of entries) {
      const result = await this.fetch('/api/v1/time-entries', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: entry.employeeExternalId,
          jobId: entry.jobSiteExternalId,
          costCodeId: entry.costCodeExternalId,
          clockIn: entry.clockInAt.toISOString(),
          clockOut: entry.clockOutAt.toISOString(),
          regularHours: entry.regularMinutes / 60,
          overtimeHours: entry.overtimeMinutes / 60,
          doubletimeHours: entry.doubletimeMinutes / 60,
          notes: entry.notes,
        }),
      })
      if (result.ok) {
        pushed++
      } else {
        failed++
        console.error(`[Spectrum] Failed to push entry for employee ${entry.employeeExternalId}:`, result.error)
      }
    }

    return { ok: true, data: { pushed, failed } }
  }
}

// Spectrum API response shapes (approximate — adjust to actual API docs)
type SpectrumJob = {
  jobId: number
  jobNumber: string
  description: string
  address?: string
  status: 'A' | 'I'
}

type SpectrumEmployee = {
  employeeId: number
  employeeNumber: string
  firstName: string
  lastName: string
  email?: string
}

type SpectrumCostCode = {
  costCodeId: number
  code: string
  description: string
}
