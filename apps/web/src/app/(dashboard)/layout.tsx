import Link from 'next/link'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <nav style={{
        width: 220,
        background: '#111827',
        color: '#f9fafb',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
        flexShrink: 0,
      }}>
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid #1f2937' }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>OnTime</span>
        </div>

        <div style={{ padding: '16px 12px', flex: 1 }}>
          {[
            { href: '/', label: 'Live Overview' },
            { href: '/timesheets', label: 'Timesheets' },
            { href: '/employees', label: 'Employees' },
            { href: '/job-sites', label: 'Job Sites' },
            { href: '/approvals', label: 'Approvals' },
            { href: '/exports', label: 'Exports' },
            { href: '/settings', label: 'Settings' },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={{
                display: 'block',
                padding: '9px 12px',
                borderRadius: 8,
                color: '#d1d5db',
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: 500,
                marginBottom: 2,
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', padding: 32 }}>
        {children}
      </main>
    </div>
  )
}
