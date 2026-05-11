export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff' }}>
      <nav style={{ padding: '16px 24px', borderBottom: '1px solid #1a1a1a', display: 'flex', gap: '24px', fontSize: '14px' }}>
        <a href="/dashboard" style={{ color: '#fff', textDecoration: 'none' }}>Pipeline</a>
        <a href="/leads" style={{ color: '#888', textDecoration: 'none' }}>Leads</a>
        <a href="/compose" style={{ color: '#888', textDecoration: 'none' }}>Compose</a>
        <a href="/settings" style={{ color: '#888', textDecoration: 'none' }}>Settings</a>
      </nav>
      <main style={{ padding: '24px' }}>{children}</main>
    </div>
  )
}