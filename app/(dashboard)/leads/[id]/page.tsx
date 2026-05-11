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
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '600', marginBottom: '4px' }}>{lead.name}</h1>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {lead.url && <a href={lead.url} target="_blank" style={{ color: '#0af', fontSize: '13px' }}>Website ↗</a>}
            <span style={{ color: '#666', fontSize: '13px', textTransform: 'capitalize' }}>{lead.source}</span>
            <span style={{ color: '#666', fontSize: '13px' }}>Score: {lead.score}</span>
            <span style={{ color: '#666', fontSize: '13px', textTransform: 'capitalize' }}>Status: {lead.status}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div style={{ background: '#111', padding: '20px', borderRadius: '8px', border: '1px solid #1a1a1a' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#888', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Research</h2>
          {lead.research ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
              <div><span style={{ color: '#666' }}>Product: </span>{lead.research.product_summary}</div>
              <div><span style={{ color: '#666' }}>Customer: </span>{lead.research.target_customer}</div>
              <div><span style={{ color: '#666' }}>GTM Motion: </span>{lead.research.gtm_motion}</div>
              <div><span style={{ color: '#666' }}>Positioning: </span>{lead.research.positioning}</div>
              <div><span style={{ color: '#666' }}>GTM Signal: </span>{lead.research.gtm_signal}</div>
              {lead.research.email_angle && <div><span style={{ color: '#666' }}>Email Angle: </span><em>{lead.research.email_angle}</em></div>}
              {lead.research.red_flags && <div><span style={{ color: '#e53' }}>Red Flags: </span>{lead.research.red_flags}</div>}
              <div><span style={{ color: '#666' }}>Confidence: </span><span style={{ textTransform: 'capitalize' }}>{lead.research.confidence}</span></div>
            </div>
          ) : <p style={{ color: '#666' }}>No research yet</p>}
        </div>

        <div style={{ background: '#111', padding: '20px', borderRadius: '8px', border: '1px solid #1a1a1a' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#888', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Draft</h2>
          {lead.email_draft ? (
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>{lead.email_draft.subject}</div>
              <div style={{ fontSize: '13px', color: '#ccc', whiteSpace: 'pre-wrap', lineHeight: '1.6', marginBottom: '16px' }}>{lead.email_draft.body}</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#666', textTransform: 'capitalize' }}>Status: {lead.email_draft.status}</span>
                <button style={{ padding: '6px 12px', background: '#fff', color: '#000', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>
                  Edit Draft
                </button>
                <button style={{ padding: '6px 12px', background: '#222', color: '#fff', border: '1px solid #333', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>
                  Send (via Resend)
                </button>
              </div>
            </div>
          ) : <p style={{ color: '#666' }}>No draft yet</p>}
        </div>
      </div>

      <div style={{ marginTop: '24px', background: '#111', padding: '20px', borderRadius: '8px', border: '1px solid #1a1a1a' }}>
        <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#888', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Activity Log</h2>
        {lead.activities.length === 0 ? <p style={{ color: '#666' }}>No activity</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {lead.activities.map((a) => (
              <div key={a.id} style={{ fontSize: '13px', display: 'flex', gap: '12px' }}>
                <span style={{ color: '#666', minWidth: '100px' }}>{a.action}</span>
                <span style={{ color: '#888' }}>{a.detail ?? ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}