'use client'

import { trpc } from '@/lib/trpc'

export default function EmployeesPage() {
  const { data: employees, isLoading } = trpc.employees.list.useQuery()

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>Employees</h1>
        <button style={{
          padding: '9px 16px',
          background: '#2563eb',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
        }}>
          Add Employee
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb' }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading...</div>
        ) : !employees?.length ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No employees yet</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Name', 'Employee #', 'Pay Type', 'Hourly Rate', 'Status'].map((h) => (
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
              {employees.map((emp) => (
                <tr key={emp.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 20px', fontWeight: 500, color: '#111827' }}>
                    {emp.firstName} {emp.lastName}
                  </td>
                  <td style={{ padding: '12px 20px', color: '#374151' }}>
                    {emp.employeeNumber ?? '—'}
                  </td>
                  <td style={{ padding: '12px 20px', color: '#374151' }}>
                    {emp.payType}
                  </td>
                  <td style={{ padding: '12px 20px', color: '#374151' }}>
                    {emp.hourlyRate ? `$${Number(emp.hourlyRate).toFixed(2)}/hr` : '—'}
                  </td>
                  <td style={{ padding: '12px 20px' }}>
                    <span style={{
                      background: emp.isActive ? '#f0fdf4' : '#f9fafb',
                      color: emp.isActive ? '#16a34a' : '#6b7280',
                      borderRadius: 12,
                      padding: '3px 10px',
                      fontSize: 12,
                      fontWeight: 500,
                    }}>
                      {emp.isActive ? 'Active' : 'Inactive'}
                    </span>
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
