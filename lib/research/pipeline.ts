import { prisma } from '../db'
import { chat, chatJSON } from '../minimax'
import type { MiniMaxMessage } from '../minimax'
import type { ResearchResult } from './types'

// ──────────────────────────────────────────────
// RESEARCH PROMPTS
// ──────────────────────────────────────────────

const TIER1_PROMPT = (name: string, url: string | null): MiniMaxMessage[] => [
  {
    role: 'system',
    content: `You are a GTM researcher. Given a startup name and optional URL, your job is to produce a quick intelligence brief in JSON. If you can't fetch the URL, use your knowledge — do not say "I don't know".`,
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

Use null for red_flags if no issues found. Keep it real.`,
  },
]

const TIER2_PROMPT = (name: string, url: string | null): MiniMaxMessage[] => [
  {
    role: 'system',
    content: `You are a senior GTM researcher. You do deep research on startups. You provide thorough, nuanced intelligence reports. You always try to fetch real information before inferring.`,
  },
  {
    role: 'user',
    content: `Do deep research on this startup:

Name: ${name}
URL: ${url ?? 'unknown'}

For this research, fetch the homepage and look for:
1. What they actually build (product summary)
2. Who their customer is
3. How they're positioning themselves
4. What their current GTM motion looks like (pricing page, blog, job posts)
5. Team size signals
6. Any recent funding announcements

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

  // Raised recently
  if (data.gtm_signal.match(/recently raised|series [a-b]|seed round/i)) score += 3
  // Hiring GTM
  if (data.gtm_signal.match(/hiring.*(marketing|gtm|sales|growth)|(marketing|gtm|sales).*hiring/i)) score += 2
  // Small team signal
  if (data.gtm_signal.match(/team (5|10|15|20|25)-/i)) score += 1
  // Has GTM motion to critique
  if (data.gtm_motion && data.gtm_motion !== 'unknown') score += 1
  // Fits a vertical we know
  if (data.target_customer.match(/startup|saas|developer|app/i)) score += 1
  // Confidence bonus
  if (data.confidence === 'high') score += 1

  // Red flags
  if (data.red_flags?.match(/has (vp|agency)|big team|too busy/i)) score -= 4

  return Math.max(0, Math.min(10, score))
}

// ──────────────────────────────────────────────
// TIER 1 RESEARCH (lightweight)
// ──────────────────────────────────────────────

async function researchTier1(leadId: string, name: string, url: string | null): Promise<void> {
  console.log(`[Research T1] ${name}`)
  try {
    const data = await chatJSON<ResearchResult>(TIER1_PROMPT(name, url))
    const score = scoreLead(data)

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: score >= 7 ? 'enriched' : score < 4 ? 'archived' : 'enriched',
        score,
        enriched_at: new Date(),
      },
    })

    // Create research doc only for non-archived
    if (score >= 4) {
      await prisma.researchDoc.create({
        data: {
          lead_id: leadId,
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
        lead_id: leadId,
        action: 'enriched',
        detail: `T1 research: score=${score} confidence=${data.confidence}`,
      },
    })
  } catch (e) {
    console.error(`[Research T1] Error ${name}:`, e)
  }
}

// ──────────────────────────────────────────────
// TIER 2 RESEARCH (deep)
// ──────────────────────────────────────────────

async function researchTier2(leadId: string, name: string, url: string | null): Promise<void> {
  console.log(`[Research T2] ${name}`)
  try {
    const data = await chatJSON<ResearchResult>(TIER2_PROMPT(name, url))
    const score = scoreLead(data)

    // Update or create research doc
    const existing = await prisma.researchDoc.findUnique({ where: { lead_id: leadId } })
    if (existing) {
      await prisma.researchDoc.update({
        where: { lead_id: leadId },
        data: {
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
    } else {
      await prisma.researchDoc.create({
        data: {
          lead_id: leadId,
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

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: 'researched',
        score,
        researched_at: new Date(),
      },
    })

    await prisma.activityLog.create({
      data: {
        lead_id: leadId,
        action: 'researched',
        detail: `T2 deep research: score=${score} confidence=${data.confidence}`,
      },
    })
  } catch (e) {
    console.error(`[Research T2] Error ${name}:`, e)
  }
}

// ──────────────────────────────────────────────
// RUN RESEARCH PIPELINE
// ──────────────────────────────────────────────

export async function runResearch(): Promise<{ tier1: number; tier2: number }> {
  console.log('[Research] Starting pipeline...')

  // Get all enriched leads for T1
  const enriched = await prisma.lead.findMany({
    where: {
      status: 'enriched',
      researched_at: null,
      score: { gte: 7 },
    },
    take: 20,
  })

  // T2: deep research on high-scored leads
  let tier2Count = 0
  for (const lead of enriched) {
    await researchTier2(lead.id, lead.name, lead.url)
    tier2Count++
  }

  // Also run T1 on any discovered leads that haven't been enriched
  const discovered = await prisma.lead.findMany({
    where: { status: 'discovered' },
    take: 50,
  })

  let tier1Count = 0
  for (const lead of discovered) {
    await researchTier1(lead.id, lead.name, lead.url)
    tier1Count++
  }

  console.log(`[Research] Done: ${tier1Count} T1, ${tier2Count} T2`)
  return { tier1: tier1Count, tier2: tier2Count }
}