import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'

async function getLead(id: string) {
  return prisma.lead.findUnique({
    where: { id },
    include: { research: true, email_draft: true, activities: { orderBy: { created_at: 'desc' } } },
  })
}

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const lead = await getLead(params.id)
  if (!lead) notFound()

  return (
    <>
      <div className="lead-header">
        <div className="flex-between">
          <div>
            <h1>{lead.name}</h1>
            <div className="lead-meta mt-8">
              {lead.url && <a href={lead.url} target="_blank" rel="noopener">Website ↗</a>}
              <span className="source-badge">{lead.source}</span>
              <span className={`badge badge-${lead.status}`}>{lead.status}</span>
              <span className="score">Score: {lead.score}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2 mb-32">
        <div className="card">
          <h2 className="label mb-16">Research</h2>
          {lead.research ? (
            <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
              {[
                ['Product', lead.research.product_summary],
                ['Customer', lead.research.target_customer],
                ['GTM Motion', lead.research.gtm_motion],
                ['Positioning', lead.research.positioning],
                ['GTM Signal', lead.research.gtm_signal],
                ['Email Angle', lead.research.email_angle],
              ].map(([label, val]) => val ? (
                <div key={label as string}>
                  <div className="pair-label">{label}</div>
                  <div style={{fontSize:'0.875rem',marginTop:'2px'}}>{val}</div>
                </div>
              ) : null)}
              {lead.research.red_flags && (
                <div>
                  <div className="pair-label" style={{color:'var(--danger)'}}>Red Flags</div>
                  <div style={{fontSize:'0.875rem',marginTop:'2px',color:'var(--danger)'}}>{lead.research.red_flags}</div>
                </div>
              )}
              <div>
                <div className="pair-label">Confidence</div>
                <div style={{fontSize:'0.875rem',textTransform:'capitalize',marginTop:'2px'}}>{lead.research.confidence}</div>
              </div>
            </div>
          ) : <p style={{color:'var(--text-3)',fontSize:'0.875rem'}}>No research yet</p>}
        </div>

        <div className="card">
          <h2 className="label mb-16">Email Draft</h2>
          {lead.email_draft ? (
            <div>
              <div className="email-preview">
                <div className="email-subject">{lead.email_draft.subject}</div>
                <div className="email-body">{lead.email_draft.body}</div>
              </div>
              <div className="flex gap-8 mt-16" style={{flexWrap:'wrap'}}>
                <span style={{fontSize:'0.8125rem',color:'var(--text-3)',textTransform:'capitalize'}}>Status: {lead.email_draft.status}</span>
                <button className="btn btn-secondary btn-sm">Edit Draft</button>
                <button className="send-btn">Send via Resend</button>
              </div>
            </div>
          ) : <p style={{color:'var(--text-3)',fontSize:'0.875rem'}}>No draft yet — run the draft pipeline</p>}
        </div>
      </div>

      <div className="card">
        <h2 className="label mb-16">Activity</h2>
        {lead.activities.length === 0 ? (
          <p style={{color:'var(--text-3)',fontSize:'0.875rem'}}>No activity</p>
        ) : (
          <div>
            {lead.activities.map(a => (
              <div key={a.id} className="activity-item">
                <span className="activity-action">{a.action}</span>
                <span className="activity-detail">{a.detail ?? ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}