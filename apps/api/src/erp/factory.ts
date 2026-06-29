import type { ERPAdapter } from './interface'
import { CsvAdapter } from './csv'
import { SpectrumAdapter } from './spectrum'

export function createERPAdapter(
  adapterType: string,
  credentials: Record<string, string>,
  config: Record<string, unknown>,
): ERPAdapter {
  switch (adapterType) {
    case 'spectrum':
      return new SpectrumAdapter(credentials, config)
    case 'csv':
      return new CsvAdapter(credentials, config)
    // Future adapters registered here
    case 'procore':
    case 'sage':
    case 'quickbooks':
    case 'adp':
    case 'none':
    default:
      return new CsvAdapter(credentials, { ...config, role: 'both' })
  }
}
