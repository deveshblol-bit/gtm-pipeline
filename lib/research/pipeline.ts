import { prisma } from '../db'
import { chatJSON } from '../minimax'
import type { MiniMaxMessage } from '../minimax'
import type { ResearchResult } from './types'

const LOCK_TTL_MS = 3 * 60 * 1000 // 3 min heartbeat TTL
const CHUNK_SIZE = 10

// ──────────────────────────────────────────────
// PROMPTS
// ──────────────────────────────────────────────

const TIER1_PROMPT = (name: string, url: string | null): MiniMaxMessage[] => [
  {
    role: 'system',
    content: 'You are a GTM researcher. Given a startup name and optional URL, produce a quick intelligence brief in JSON. Use your knowledge if you cannot fetch the URL — do not say "I don\'t know".',
  },
  {
    role: 'user',
    content: `Research this startup:

Name: ${name}
URL: ${url ?? 'unknown'}

Return a JSON object ONLY (no markdown, no explanation) with these exact fields:
{
  "product_summary": "one sentence what they build",
  "target_customer": "who they sell to",
  "current_gtm_motion": "what public GTM they're doing (job posts, ads, pricing page, content)",
  "positioning": "how they describe themselves in their own words",
  "gtm_signal": "signs they feel GTM pain (hiring GTM, recent raise, no VP marketing)",
  "red_flags": "reasons to skip (too big, has agency, mass hiring = too busy) or null",
  "email_angle": "one specific observation about them that would make a good email opening",
  "confidence": "high if you found their site, medium if you inferred, low if very uncertain"
}

Use null for red_flags if no issues found.`,
  },
]

const TIER2_PROMPT = (name: string, url: string | null): MiniMaxMessage[] => [
  {
    role: 'system',
    content: 'You are a senior GTM researcher. Do deep research on startups. Be thorough and specific.',
  },
  {
    role: 'user',
    content: `Do deep research on this startup:

Name: ${name}
URL: ${url ?? 'unknown'}

Return a JSON object ONLY with:
{
  "product_summary": "detailed one sentence on what they build",
  "target_customer": "specific description of who they sell to",
  "current_gtm_motion": "detailed breakdown of their public GTM: content, positioning, channels, hiring",
  "positioning": "their exact words from their homepage hero/about",
  "gtm_signal": "strong signal analysis: do they feel GTM pain? are they hiring? recently raised?",
  "red_flags": "deal-breakers or null",
  "email_angle": "the single strongest observation that would make a founder actually read an email",
  "confidence": "high/medium/low"
}

This is Tier 2 deep research — be thorough and specific.`,
  },
]

// ──────────────────────────────────────────────
// SCORING
// ──────────────────────────────────────────────

function scoreLead(data: ResearchResult): number {
  let score = 0
  if (data.gtm_signal?.match(/recently raised|series [a-b]|seed round/i)) score += 3
  if (data.gtm_signal?.match(/hiring.*(marketing|gtm|sales|growth)|(marketing|gtm|sales).*hiring/i)) score += 2
  if (data.gtm_signal?.match(/team (5|10|15|20|25)-/i)) score += 1
  if (data.gtm_motion && data.gtm_motion !== 'unknown') score += 1
  if (data.target_customer?.match(/startup|saas|developer|app/i)) score += 1
  if (data.confidence === 'high') score += 1
  if (data.red_flags?.match(/has (vp|agency)|big team|too busy/i)) score -= 4
  return Math.max(0, Math.min(10, score))
}

// ──────────────────────────────────────────────
// QUEUE HELPERS
// ──────────────────────────────────────────────

/** Enqueue leads for T1 research */
export async function enqueueResearchT1(leadIds: string[]): Promise<void> {
  await prisma.processQueue.createMany({
    data: leadIds.map(id => ({ lead_id: id, stage: 'research_t1' })),
    skipDuplicates: true,
  })
}

/** Enqueue leads for T2 research (only score >= 7) */
export async function enqueueResearchT2(leadIds: string[]): Promise<void> {
  await prisma.processQueue.createMany({
    data: leadIds.map(id => ({ lead_id: id, stage: 'research_t2' })),
    skipDuplicates: true,
  })
}

// ──────────────────────────────────────────────
// PROCESS ONE QUEUE ITEM
// ──────────────────────────────────────────────

async function processQueueItem(item: any): Promise<void> {
  const lead = await prisma.lead.findUnique({ where: { id: item.lead_id } })
  if (!lead) {
    await prisma.processQueue.delete({ where: { id: item.id } }).catch(() => {})
    return
  }

  try {
    if (item.stage === 'research_t1') {
      const data = await chatJSON<ResearchResult>(TIER1_PROMPT(lead.name, lead.url))
      const score = scoreLead(data)

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: score >= 4 ? 'enriched' : 'archived',
          score,
          enriched_at: new Date(),
        },
      })

      if (score >= 4) {
        await prisma.researchDoc.upsert({
          where: { lead_id: lead.id },
          create: {
            lead_id: lead.id,
            product_summary: data.product_summary,
            target_customer: data.target_customer,
            gtm_motion: data.gtm_motion,
            positioning: data.positioning,
            gtm_signal: data.gtm_signal,
            red_flags: data.red_flags,
            email_angle: data.email_angle,
            confidence: data.confidence,
            raw_json: data as any,
          },
          update: {
            product_summary: data.product_summary,
            target_customer: data.target_customer,
            gtm_motion: data.gtm_motion,
            positioning: data.positioning,
            gtm_signal: data.gtm_signal,
            red_flags: data.red_flags,
            email_angle: data.email_angle,
            confidence: data.confidence,
            raw_json: data as any,
          },
        })
      }

      await prisma.activityLog.create({
        data: {
          lead_id: lead.id,
          action: 'enriched',
          detail: `T1 research: score=${score} confidence=${data.confidence}`,
        },
      })

      await prisma.processQueue.update({
        where: { id: item.id },
        data: { status: 'done' },
      })

      // Enqueue for T2 if score >= 7
      if (score >= 7) {
        await enqueueResearchT2([lead.id])
      }
    }

    else if (item.stage === 'research_t2') {
      const data = await chatJSON<ResearchResult>(TIER2_PROMPT(lead.name, lead.url))
      const score = scoreLead(data)

      await prisma.researchDoc.upsert({
        where: { lead_id: lead.id },
        create: {
          lead_id: lead.id,
          product_summary: data.product_summary,
          target_customer: data.target_customer,
          gtm_motion: data.gtm_motion,
          positioning: data.positioning,
          gtm_signal: data.gtm_signal,
          red_flags: data.red_flags,
          email_angle: data.email_angle,
          confidence: data.confidence,
          raw_json: data as any,
        },
        update: {
          product_summary: data.product_summary,
          target_customer: data.target_customer,
          gtm_motion: data.gtm_motion,
          positioning: data.positioning,
          gtm_signal: data.gtm_signal,
          red_flags: data.red_flags,
          email_angle: data.email_angle,
          confidence: data.confidence,
          raw_json: data as any,
        },
      })

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: 'researched',
          score,
          researched_at: new Date(),
        },
      })

      await prisma.activityLog.create({
        data: {
          lead_id: lead.id,
          action: 'researched',
          detail: `T2 research: score=${score} confidence=${data.confidence}`,
        },
      })

      await prisma.processQueue.update({
        where: { id: item.id },
        data: { status: 'done' },
      })
    }
  } catch (e: any) {
    console.error(`[Queue] Error processing ${item.id}:`, e)
    await prisma.processQueue.update({
      where: { id: item.id },
      data: {
        status: 'failed',
        attempts: { increment: 1 },
        error: e.message,
      },
    })
  }
}

// ──────────────────────────────────────────────
// CRON HANDLER — called every 5 minutes by Vercel Cron
// ──────────────────────────────────────────────

export async function processQueueChunk(): Promise<{ processed: number; skipped: number }> {
  // 1. Claim stale locks (heartbeat timeout)
  const staleThreshold = new Date(Date.now() - LOCK_TTL_MS)
  const staleItems = await prisma.processQueue.findMany({
    where: {
      status: 'processing',
      locked_at: { lt: staleThreshold },
    },
  })
  for (const item of staleItems) {
    await prisma.processQueue.update({
      where: { id: item.id },
      data: { status: 'pending', locked_at: null },
    }).catch(() => {})
  }

  // 2. Claim a fresh chunk of pending items
  const items = await prisma.processQueue.findMany({
    where: { status: 'pending' },
    take: CHUNK_SIZE,
    orderBy: { created_at: 'asc' },
  })

  for (const item of items) {
    // Idempotency: re-check status inside lock
    const current = await prisma.processQueue.findUnique({ where: { id: item.id } })
    if (!current || current.status !== 'pending') continue

    await prisma.processQueue.update({
      where: { id: item.id },
      data: { status: 'processing', locked_at: new Date() },
    })

    await processQueueItem(item)
  }

  return { processed: items.length, skipped: 0 }
}

// ──────────────────────────────────────────────
// BOOTSTRAP: enqueue T1 for all discovered leads not yet in queue
// ──────────────────────────────────────────────

export async function bootstrapResearch(): Promise<number> {
  const inQueue = await prisma.processQueue.findMany({
    where: { stage: { in: ['research_t1', 'research_t2'] } },
    select: { lead_id: true },
  })
  const queuedIds = new Set(inQueue.map(q => q.lead_id))

  const leads = await prisma.lead.findMany({
    where: {
      status: 'discovered',
      NOT: { id: { in: [...queuedIds] } },
    },
    take: 100,
  })

  if (leads.length > 0) {
    await enqueueResearchT1(leads.map(l => l.id))
  }
  return leads.length
}

// Legacy: runResearch enqueues all discovered leads into the queue
export async function runResearch(): Promise<{ enqueued: number }> {
  const count = await bootstrapResearch()
  return { enqueued: count }
}