export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav>
        <span className="logo">GTM Pipeline</span>
        <a href="/dashboard">Pipeline</a>
        <a href="/leads">Leads</a>
        <a href="/compose">Compose</a>
        <a href="/settings">Settings</a>
      </nav>
      <div className="page">
        {children}
      </div>
    </>
  )
}