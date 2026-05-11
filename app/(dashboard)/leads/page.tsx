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

  const statusColors: Record<string, string> = {
    discovered: '#666', enriched: '#f90', researched: '#0af', drafted: '#0f0', sent: '#fff', archived: '#333'
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '600' }}>Leads ({leads.length})</h1>
      </div>

      <div style={{ background: '#111', borderRadius: '8px', border: '1px solid #1a1a1a', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: '#666', fontSize: '12px', fontWeight: '500' }}>COMPANY</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: '#666', fontSize: '12px', fontWeight: '500' }}>SOURCE</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: '#666', fontSize: '12px', fontWeight: '500' }}>STATUS</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: '#666', fontSize: '12px', fontWeight: '500' }}>SCORE</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: '#666', fontSize: '12px', fontWeight: '500' }}>EMAIL</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#666' }}>No leads yet</td></tr>
            ) : leads.map((lead) => (
              <tr key={lead.id} style={{ borderBottom: '1px solid #111' }}>
                <td style={{ padding: '12px 16px' }}>
                  <Link href={`/leads/${lead.id}`} style={{ color: '#fff', textDecoration: 'none', fontWeight: '500' }}>
                    {lead.name}
                  </Link>
                </td>
                <td style={{ padding: '12px 16px', color: '#888', fontSize: '13px', textTransform: 'capitalize' }}>{lead.source}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontSize: '12px', color: statusColors[lead.status] ?? '#666', textTransform: 'capitalize' }}>{lead.status}</span>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '14px' }}>{lead.score}</td>
                <td style={{ padding: '12px 16px' }}>
                  {lead.email_draft ? (
                    <span style={{ fontSize: '12px', color: '#0f0' }}>✓ {lead.email_draft.status}</span>
                  ) : <span style={{ color: '#444' }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}