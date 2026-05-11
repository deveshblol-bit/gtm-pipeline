import { NextRequest, NextResponse } from 'next/server'
import { runDiscovery } from '@/lib/discovery/sources'
import { bootstrapResearch, processQueueChunk } from '@/lib/research/pipeline'
import { draftEmails } from '@/lib/email/drafting'

// Combined endpoint — discover + enqueue + process (up to 20 leads)
// Called by the local cron job on your Ubuntu machine
export async function POST(req: NextRequest) {
  try {
    const {
      discover = true,
      processQueue = true,
      chunkSize = 20,
    } = await req.json().catch(() => ({}))

    const results: Record<string, unknown> = {}

    // 1. Run discovery
    if (discover) {
      try {
        const { total, saved } = await runDiscovery()
        results.discover = { total, saved }
      } catch (e: any) {
        results.discover = { error: e.message }
      }
    }

    // 2. Enqueue discovered leads + process a chunk
    if (processQueue) {
      try {
        const bootstrapped = await bootstrapResearch()
        const { processed } = await processQueueChunk()
        results.research = { bootstrapped, processed, chunkSize }
      } catch (e: any) {
        results.research = { error: e.message }
      }

      // 3. Draft emails for researched leads
      try {
        const drafted = await draftEmails()
        results.draft = drafted
      } catch (e: any) {
        results.draft = { error: e.message }
      }
    }

    return NextResponse.json({ ok: true, ...results })
  } catch (e: any) {
    console.error('[Cron/Run]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// GET for quick health check / manual trigger
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'gtm-pipeline cron',
    endpoint: '/api/cron/run',
    methods: {
      POST: 'run full pipeline: discover + enqueue research + process queue + draft emails',
      body: { discover: true, processQueue: true, chunkSize: 20 },
    },
  })
}