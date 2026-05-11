export default function SettingsPage() {
  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '24px' }}>Settings</h1>

      <div style={{ background: '#111', padding: '20px', borderRadius: '8px', border: '1px solid #1a1a1a', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>API Keys</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '4px' }}>MINIMAX_API_KEY</label>
            <input type="password" value="sk-cp-..." readOnly style={{ width: '100%', padding: '8px 12px', background: '#0a0a0a', border: '1px solid #333', borderRadius: '6px', color: '#888', fontSize: '14px' }} />
          </div>
          <div>
            <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '4px' }}>DATABASE_URL</label>
            <input type="text" value="postgresql://neondb..." readOnly style={{ width: '100%', padding: '8px 12px', background: '#0a0a0a', border: '1px solid #333', borderRadius: '6px', color: '#888', fontSize: '14px' }} />
          </div>
        </div>
      </div>

      <div style={{ background: '#111', padding: '20px', borderRadius: '8px', border: '1px solid #1a1a1a' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Cron Endpoints</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', fontFamily: 'monospace' }}>
          <div><span style={{ color: '#666' }}>POST</span> <span style={{ color: '#0af' }}>/api/cron/discover</span> — Run all discovery sources</div>
          <div><span style={{ color: '#666' }}>POST</span> <span style={{ color: '#0af' }}>/api/cron/research</span> — Run research pipeline</div>
          <div><span style={{ color: '#666' }}>POST</span> <span style={{ color: '#0af' }}>/api/cron/draft</span> — Generate email drafts</div>
        </div>
      </div>
    </div>
  )
}