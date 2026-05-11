import { prisma } from '@/lib/db'
import PipelineControls from '@/components/PipelineControls'

async function getStats() {
  const total = await prisma.lead.count()
  const byStatus = await prisma.lead.groupBy({ by: ['status'], _count: true })
  const bySource = await prisma.lead.groupBy({ by: ['source'], _count: true })
  const recent = await prisma.lead.findMany({ orderBy: { created_at: 'desc' }, take: 10, include: { research: true, email_draft: true } })
  return { total, byStatus, bySource, recent }
}

export default async function DashboardPage() {
  const { total, byStatus, bySource, recent } = await getStats()

  const statusLabels: Record<string, string> = {
    discovered: 'Discovered', enriched: 'Enriched', researched: 'Researched', drafted: 'Drafted', sent: 'Sent', archived: 'Archived',
  }

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '24px' }}>GTM Pipeline</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {['discovered', 'enriched', 'researched', 'drafted'].map((s) => {
          const found = byStatus.find((b) => b.status === s)
          return (
            <div key={s} style={{ background: '#111', padding: '20px', borderRadius: '8px', border: '1px solid #1a1a1a' }}>
              <div style={{ fontSize: '28px', fontWeight: '700' }}>{found?._count ?? 0}</div>
              <div style={{ color: '#666', fontSize: '13px', marginTop: '4px' }}>{statusLabels[s] ?? s}</div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div style={{ background: '#111', padding: '20px', borderRadius: '8px', border: '1px solid #1a1a1a' }}>
          <h2 style={{ fontSize: '16px', marginBottom: '16px' }}>By Source</h2>
          {bySource.length === 0 ? <p style={{ color: '#666' }}>No data yet</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {bySource.map((s) => (
                <div key={s.source} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: '#888', textTransform: 'capitalize' }}>{s.source}</span>
                  <span>{s._count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: '#111', padding: '20px', borderRadius: '8px', border: '1px solid #1a1a1a' }}>
          <h2 style={{ fontSize: '16px', marginBottom: '16px' }}>Recent Leads</h2>
          {recent.length === 0 ? <p style={{ color: '#666' }}>No leads yet — run discovery first</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recent.map((lead) => (
                <a key={lead.id} href={`/leads/${lead.id}`} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px', background: '#0a0a0a', borderRadius: '6px', textDecoration: 'none', color: 'inherit'
                }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '500' }}>{lead.name}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{lead.source}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#666', textTransform: 'capitalize' }}>{lead.status}</span>
                    {lead.email_draft && <span style={{ fontSize: '10px', background: '#222', padding: '2px 6px', borderRadius: '4px' }}>✓ draft</span>}
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <PipelineControls />
    </div>
  )
}