export default function SettingsPage() {
  return (
    <>
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      <div className="card settings-section">
        <h2>Environment Variables</h2>
        <div className="settings-row">
          <div>
            <label className="label mb-8" style={{display:'block'}}>MINIMAX_API_KEY</label>
            <input type="password" defaultValue="••••••••••••••••" readOnly />
          </div>
          <div>
            <label className="label mb-8" style={{display:'block'}}>DATABASE_URL</label>
            <input type="text" defaultValue="postgresql://neondb..." readOnly />
          </div>
        </div>
        <div className="settings-row">
          <div>
            <label className="label mb-8" style={{display:'block'}}>APP_PASSWORD</label>
            <input type="text" defaultValue="devesh" readOnly />
          </div>
          <div>
            <label className="label mb-8" style={{display:'block'}}>RESEND_API_KEY</label>
            <input type="password" defaultValue="" placeholder="Not set — add to send emails" />
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Cron Endpoints</h2>
        <div style={{display:'flex',flexDirection:'column',gap:'8px',fontSize:'0.875rem',fontFamily:'monospace',marginTop:'12px'}}>
          {[
            ['POST','/api/cron/discover','Run all discovery sources'],
            ['POST','/api/cron/research','Run T1 + T2 research pipeline'],
            ['POST','/api/cron/draft','Generate email drafts'],
          ].map(([method, path, desc]) => (
            <div key={path} className="flex gap-12" style={{padding:'10px 12px',background:'var(--surface-2)',borderRadius:'var(--radius-sm)'}}>
              <span style={{color:'var(--accent)',fontWeight:'600',minWidth:'40px'}}>{method}</span>
              <span style={{color:'var(--text)'}}>{path}</span>
              <span style={{color:'var(--text-3)'}}>— {desc}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}