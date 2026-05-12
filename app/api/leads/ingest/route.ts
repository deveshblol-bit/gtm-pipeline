import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const { leads } = await request.json()
    if (!Array.isArray(leads)) {
      return NextResponse.json({ error: 'leads must be an array' }, { status: 400 })
    }

    let saved = 0
    for (const lead of leads) {
      if (!lead.name) continue
      await prisma.lead.upsert({
        where: {
          name_source: {
            name: lead.name,
            source: lead.source ?? 'unknown',
          },
        },
        update: {},
        create: {
          name: lead.name,
          url: lead.url ?? null,
          description: lead.description ?? null,
          source: lead.source ?? 'unknown',
          logo_url: lead.logo_url ?? null,
        },
      })
      saved++
    }

    return NextResponse.json({ ok: true, saved, total: leads.length })
  } catch (e: any) {
    console.error('[Leads/Ingest]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}