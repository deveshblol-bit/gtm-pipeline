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
    <>
      <div className="page-header">
        <h1>Compose <span style={{fontWeight:'400',color:'var(--text-3)',fontSize:'1rem'}}>{leads.length} ready</span></h1>
      </div>

      {leads.length === 0 ? (
        <div className="card empty-state">
          <p>No drafted emails yet. Run discovery → research → draft first.</p>
        </div>
      ) : (
        <div>
          {leads.map(lead => (
            <div key={lead.id} className="card compose-card">
              <div className="card-header">
                <div>
                  <div className="company-name">{lead.name}</div>
                  <div className="company-meta">{lead.source} · Score: {lead.score}</div>
                </div>
                <button className="send-btn">Send</button>
              </div>
              {lead.research?.email_angle && (
                <div className="email-angle">"{lead.research.email_angle}"</div>
              )}
              {lead.email_draft && (
                <div className="email-preview">
                  <div className="email-subject">{lead.email_draft.subject}</div>
                  <div className="email-body">{lead.email_draft.body}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}