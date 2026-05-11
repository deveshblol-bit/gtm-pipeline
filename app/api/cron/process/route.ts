import { NextResponse } from 'next/server'
import { processQueueChunk, bootstrapResearch } from '@/lib/research/pipeline'

export async function POST() {
  try {
    // Bootstrap: enqueue any discovered leads not yet in queue
    const bootstrapped = await bootstrapResearch()
    // Process a chunk of queue items (up to 10)
    const { processed } = await processQueueChunk()
    return NextResponse.json({
      ok: true,
      bootstrapped,
      processed,
      next_check: '5 minutes',
    })
  } catch (e: any) {
    console.error('[Cron/Process]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// Vercel Cron: GET is also called by the cron scheduler
export async function GET() {
  return POST()
}