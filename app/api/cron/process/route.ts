import { NextResponse } from 'next/server'
import { bootstrapResearch, processQueueChunk } from '@/lib/research/pipeline'

// Runs once/day via Vercel Cron (safety net)
// Also callable manually — processes 10 leads per call
export async function POST() {
  try {
    const bootstrapped = await bootstrapResearch()
    const { processed } = await processQueueChunk()
    return NextResponse.json({
      ok: true,
      bootstrapped,
      processed,
      note: 'Hobby plan: once/day cron. Click "Process Queue" in dashboard to run manually.',
    })
  } catch (e: any) {
    console.error('[Cron/Process]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET() {
  return POST()
}