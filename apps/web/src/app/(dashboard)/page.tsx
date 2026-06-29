'use client'

import { useCallback, useRef, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { useSSE } from '@/lib/sse'
import { useQueryClient } from '@tanstack/react-query'

type ClockInEvent = {
  type: 'clock_in'
  employeeId: string
  name: string
  jobSiteId?: string
  lat?: number
  lng?: number
  at: string
  timeEntryId: string
}

type ClockOutEvent = {
  type: 'clock_out'
  employeeId: string
  timeEntryId: string
  totalMinutes: number
  at: string
}

export default function LiveOverviewPage() {
  const queryClient = useQueryClient()
  const { data: activeEntries, isLoading } = trpc.timesheets.listActive.useQuery(undefined, {
    refetchInterval: 60_000, // fallback polling every 60s
  })

  const utils = trpc.useUtils()

  const handleSSEEvent = useCallback(
    (event: { type: string; [key: string]: unknown }) => {
      if (event.type === 'clock_in' || event.type === 'clock_out') {
        // Invalidate to refetch active list
        utils.timesheets.listActive.invalidate().catch(() => {})
      }
    },
    [utils],
  )

  useSSE({ onEvent: handleSSEEvent })

  const now = new Date()

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>Live Overview</h1>
          <p style={{ color: '#6b7280', marginTop: 4 }}>
            {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: 20,
          padding: '6px 14px',
          color: '#16a34a',
          fontSize: 13,
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
          Live
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Clocked In', value: isLoading ? '—' : String(activeEntries?.length ?? 0), color: '#2563eb' },
          { label: 'On Site Today', value: '—', color: '#7c3aed' },
          { label: 'Hours Today', value: '—', color: '#d97706' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: '#fff',
            borderRadius: 12,
            padding: '20px 24px',
            border: '1px solid #e5e7eb',
          }}>
            <p style={{ color: '#6b7280', fontSize: 13, fontWeight: 500 }}>{label}</p>
            <p style={{ fontSize: 32, fontWeight: 700, color, marginTop: 4 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Employee grid */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #f3f4f6' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>Currently Clocked In</h2>
        </div>

        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading...</div>
        ) : !activeEntries?.length ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
            No employees clocked in
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Employee', 'Clock In', 'Duration', 'Source', 'Location'].map((h) => (
                  <th key={h} style={{
                    padding: '10px 24px',
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
              {activeEntries.map((entry) => {
                const elapsed = Math.floor(
                  (Date.now() - new Date(entry.clockInAt).getTime()) / 60_000,
                )
                const hrs = Math.floor(elapsed / 60)
                const mins = elapsed % 60

                return (
                  <tr key={entry.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '14px 24px' }}>
                      <span style={{ fontWeight: 500, color: '#111827' }}>
                        {entry.employeeName} {entry.employeeLastName}
                      </span>
                    </td>
                    <td style={{ padding: '14px 24px', color: '#374151' }}>
                      {new Date(entry.clockInAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td style={{ padding: '14px 24px', color: '#374151' }}>
                      {hrs > 0 ? `${hrs}h ` : ''}{mins}m
                    </td>
                    <td style={{ padding: '14px 24px' }}>
                      <span style={{
                        background: entry.source === 'mobile_geofence' ? '#eff6ff' : '#f9fafb',
                        color: entry.source === 'mobile_geofence' ? '#2563eb' : '#6b7280',
                        borderRadius: 12,
                        padding: '2px 10px',
                        fontSize: 12,
                        fontWeight: 500,
                      }}>
                        {entry.source.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '14px 24px', color: '#6b7280', fontSize: 12 }}>
                      {entry.clockInLat && entry.clockInLng
                        ? `${parseFloat(String(entry.clockInLat)).toFixed(4)}, ${parseFloat(String(entry.clockInLng)).toFixed(4)}`
                        : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
