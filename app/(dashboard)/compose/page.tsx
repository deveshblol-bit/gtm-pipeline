import { prisma } from '@/lib/db'
import Link from 'next/link'

async function getDraftedLeads() {
  return prisma.lead.findMany({
    where: { status: 'drafted' },
    include: { research: true, email_draft: true },
    orderBy: { score: 'desc' },
    take: 20,
  })
}

export default async function ComposePage() {
  const leads = await getDraftedLeads()

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '24px' }}>Compose — Ready to Send ({leads.length})</h1>

      {leads.length === 0 ? (
        <div style={{ background: '#111', padding: '40px', borderRadius: '8px', textAlign: 'center', color: '#666' }}>
          No drafted emails yet. Run discovery → research → draft pipeline first.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {leads.map((lead) => (
            <div key={lead.id} style={{ background: '#111', borderRadius: '8px', border: '1px solid #1a1a1a', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <Link href={`/leads/${lead.id}`} style={{ fontSize: '16px', fontWeight: '600', color: '#fff', textDecoration: 'none' }}>{lead.name}</Link>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{lead.source} · Score: {lead.score}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={{ padding: '8px 16px', background: '#fff', color: '#000', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                    Send
                  </button>
                </div>
              </div>
              {lead.research && (
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>
                  <em>"{lead.research.email_angle}"</em>
                </div>
              )}
              {lead.email_draft && (
                <div style={{ background: '#0a0a0a', padding: '12px', borderRadius: '6px', fontSize: '13px' }}>
                  <div style={{ fontWeight: '600', marginBottom: '6px', color: '#0af' }}>{lead.email_draft.subject}</div>
                  <div style={{ color: '#ccc', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{lead.email_draft.body}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}