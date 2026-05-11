import { prisma } from '@/lib/db'
import Link from 'next/link'

async function getLeads() {
  return prisma.lead.findMany({
    orderBy: { created_at: 'desc' },
    include: { research: true, email_draft: true },
  })
}

export default async function LeadsPage() {
  const leads = await getLeads()

  return (
    <>
      <div className="page-header">
        <h1>Leads <span style={{fontWeight:'400',color:'var(--text-3)',fontSize:'1rem'}}>{leads.length}</span></h1>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Source</th>
              <th>Status</th>
              <th>Score</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr><td colSpan={5} style={{textAlign:'center',padding:'40px',color:'var(--text-3)'}}>No leads yet</td></tr>
            ) : leads.map(lead => (
              <tr key={lead.id}>
                <td><Link href={`/leads/${lead.id}`}>{lead.name}</Link></td>
                <td><span className="source-badge">{lead.source}</span></td>
                <td><span className={`badge badge-${lead.status}`}>{lead.status}</span></td>
                <td><span className="score">{lead.score}</span></td>
                <td>{lead.email_draft
                  ? <span style={{color:'var(--success)',fontSize:'0.8125rem'}}>✓ {lead.email_draft.status}</span>
                  : <span style={{color:'var(--border)'}}>—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}