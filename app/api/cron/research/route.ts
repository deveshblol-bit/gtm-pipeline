import { NextResponse } from 'next/server'
import { runResearch } from '@/lib/research/pipeline'

// Manual trigger — kicks off the queue bootstrap (actual processing happens via /api/cron/process)
export async function POST() {
  try {
    const result = await runResearch()
    return NextResponse.json({ ok: true, ...result })
  } catch (e: any) {
    console.error('[Cron/Research]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}