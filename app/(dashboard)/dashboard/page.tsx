import { prisma } from '@/lib/db'
import PipelineControls from '@/components/PipelineControls'
import Link from 'next/link'

async function getStats() {
  const total = await prisma.lead.count()
  const byStatus = await prisma.lead.groupBy({ by: ['status'], _count: true })
  const bySource = await prisma.lead.groupBy({ by: ['source'], _count: true })
  const recent = await prisma.lead.findMany({
    orderBy: { created_at: 'desc' }, take: 8,
    include: { research: true, email_draft: true }
  })
  return { total, byStatus, bySource, recent }
}

export default async function DashboardPage() {
  const { total, byStatus, bySource, recent } = await getStats()

  const labels: Record<string, string> = {
    discovered: 'Discovered',
    enriched: 'Enriched',
    researched: 'Researched',
    drafted: 'Drafted',
    sent: 'Sent',
    archived: 'Archived',
  }

  const countOf = (s: string) => byStatus.find(b => b.status === s)?._count ?? 0

  return (
    <>
      <div className="page-header">
        <h1>Pipeline Overview</h1>
      </div>

      <div className="grid-4 mb-32">
        {['discovered','enriched','researched','drafted'].map(s => (
          <div key={s} className="stat-card">
            <div className="stat-number">{countOf(s)}</div>
            <div className="stat-label">{labels[s]}</div>
          </div>
        ))}
      </div>

      <div className="grid-2 mb-32">
        <div className="card">
          <h2 className="mb-16">By Source</h2>
          {bySource.length === 0 ? (
            <p className="empty-state" style={{padding:'24px'}}>No data yet</p>
          ) : (
            <div>
              {bySource.map(s => (
                <div key={s.source} className="flex-between" style={{padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
                  <span style={{textTransform:'capitalize',fontSize:'0.875rem'}}>{s.source}</span>
                  <span className="score">{s._count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 className="mb-16">Recent Leads</h2>
          {recent.length === 0 ? (
            <p className="empty-state" style={{padding:'24px'}}>No leads yet — run discovery first</p>
          ) : (
            <div style={{ overflowY: 'auto', flex: 1, maxHeight: '340px' }}>
              {recent.map(lead => (
                <Link key={lead.id} href={`/leads/${lead.id}`} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid var(--border)',textDecoration:'none',color:'inherit'}}>
                  <div>
                    <div style={{fontSize:'0.875rem',fontWeight:'500'}}>{lead.name}</div>
                    <div style={{fontSize:'0.75rem',color:'var(--text-3)',marginTop:'2px'}}>{lead.source}</div>
                  </div>
                  <div className="flex gap-8" style={{alignItems:'center'}}>
                    <span className={`badge badge-${lead.status}`}>{lead.status}</span>
                    {lead.email_draft && <span style={{color:'var(--success)',fontSize:'0.75rem'}}>✓</span>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="run-panel">
        <h2>Run Pipelines</h2>
        <PipelineControls />
      </div>
    </>
  )
}