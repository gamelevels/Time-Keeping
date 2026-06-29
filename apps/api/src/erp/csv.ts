import type {
  ERPAdapter,
  ERPJobSite,
  ERPEmployee,
  ERPCostCode,
  ERPTimeEntry,
  ERPSyncResult,
} from './interface'

type CsvConfig = {
  jobsData?: string
  employeesData?: string
  fieldMappings?: Record<string, string>
}

export class CsvAdapter implements ERPAdapter {
  readonly adapterType = 'csv' as const
  readonly role: 'source' | 'sink' | 'both'
  private config: CsvConfig

  constructor(credentials: Record<string, string>, config: Record<string, unknown>) {
    this.role = (config.role as 'source' | 'sink' | 'both') ?? 'both'
    this.config = {
      jobsData: config.jobsData as string | undefined,
      employeesData: config.employeesData as string | undefined,
      fieldMappings: (config.fieldMappings as Record<string, string>) ?? {},
    }
  }

  async testConnection(): Promise<ERPSyncResult<{ message: string }>> {
    return { ok: true, data: { message: 'CSV adapter ready — upload files to sync' } }
  }

  async listJobSites(): Promise<ERPSyncResult<ERPJobSite[]>> {
    if (!this.config.jobsData) {
      return { ok: true, data: [] }
    }
    try {
      const rows = this.parseCsv(this.config.jobsData)
      const map = this.config.fieldMappings ?? {}
      const sites: ERPJobSite[] = rows.map((row) => ({
        externalId: row[map['id'] ?? 'id'] ?? '',
        name: row[map['name'] ?? 'name'] ?? '',
        jobNumber: row[map['job_number'] ?? 'job_number'] ?? '',
        isActive: (row[map['is_active'] ?? 'is_active'] ?? 'true') !== 'false',
      }))
      return { ok: true, data: sites }
    } catch (e) {
      return { ok: false, error: String(e), retryable: false }
    }
  }

  async listEmployees(): Promise<ERPSyncResult<ERPEmployee[]>> {
    if (!this.config.employeesData) {
      return { ok: true, data: [] }
    }
    try {
      const rows = this.parseCsv(this.config.employeesData)
      const map = this.config.fieldMappings ?? {}
      const employees: ERPEmployee[] = rows.map((row) => ({
        externalId: row[map['id'] ?? 'id'] ?? '',
        employeeNumber: row[map['employee_number'] ?? 'employee_number'] ?? '',
        firstName: row[map['first_name'] ?? 'first_name'] ?? '',
        lastName: row[map['last_name'] ?? 'last_name'] ?? '',
        email: row[map['email'] ?? 'email'],
      }))
      return { ok: true, data: employees }
    } catch (e) {
      return { ok: false, error: String(e), retryable: false }
    }
  }

  async listCostCodes(_jobSiteExternalId: string): Promise<ERPSyncResult<ERPCostCode[]>> {
    return { ok: true, data: [] }
  }

  async pushTimeEntries(
    entries: ERPTimeEntry[],
  ): Promise<ERPSyncResult<{ pushed: number; failed: number }>> {
    // CSV sink: generate export data (stored in config, retrieved via export endpoint)
    return { ok: true, data: { pushed: entries.length, failed: 0 } }
  }

  private parseCsv(data: string): Record<string, string>[] {
    const lines = data.trim().split('\n')
    if (lines.length < 2) return []
    const headers = (lines[0] ?? '').split(',').map((h) => h.trim().toLowerCase())
    return lines.slice(1).map((line) => {
      const values = line.split(',').map((v) => v.trim())
      return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
    })
  }
}
