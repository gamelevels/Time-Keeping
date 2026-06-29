'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'

export default function TimesheetsPage() {
  const [page, setPage] = useState(1)

  const { data: entries, isLoading } = trpc.timesheets.list.useQuery({
    page,
    pageSize: 50,
  })

  function formatDuration(minutes: number | null) {
    if (!minutes) return '—'
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 24 }}>
        Timesheets
      </h1>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb' }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading...</div>
        ) : !entries?.length ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No entries found</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Employee', 'Job Site', 'Cost Code', 'Clock In', 'Clock Out', 'Duration', 'Status'].map((h) => (
                  <th key={h} style={{
                    padding: '10px 20px',
                    textAlign: 'left',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 20px', fontWeight: 500 }}>
                    {entry.firstName} {entry.lastName}
                  </td>
                  <td style={{ padding: '12px 20px', color: '#374151' }}>
                    {entry.jobSiteName ?? '—'}
                  </td>
                  <td style={{ padding: '12px 20px', color: '#374151' }}>
                    {entry.costCodeCode ?? '—'}
                  </td>
                  <td style={{ padding: '12px 20px', color: '#374151' }}>
                    {new Date(entry.clockInAt).toLocaleString('en-US', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td style={{ padding: '12px 20px', color: '#374151' }}>
                    {entry.clockOutAt
                      ? new Date(entry.clockOutAt).toLocaleString('en-US', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })
                      : <span style={{ color: '#16a34a', fontWeight: 500 }}>Active</span>}
                  </td>
                  <td style={{ padding: '12px 20px', color: '#374151' }}>
                    {formatDuration(entry.totalMinutes)}
                  </td>
                  <td style={{ padding: '12px 20px' }}>
                    <StatusBadge status={entry.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    active: { bg: '#f0fdf4', color: '#16a34a' },
    pending_approval: { bg: '#fffbeb', color: '#d97706' },
    approved: { bg: '#eff6ff', color: '#2563eb' },
    rejected: { bg: '#fef2f2', color: '#dc2626' },
    exported: { bg: '#f5f3ff', color: '#7c3aed' },
  }
  const s = styles[status] ?? { bg: '#f9fafb', color: '#6b7280' }

  return (
    <span style={{
      background: s.bg,
      color: s.color,
      borderRadius: 12,
      padding: '3px 10px',
      fontSize: 12,
      fontWeight: 500,
    }}>
      {status.replace('_', ' ')}
    </span>
  )
}
