import { prisma } from '../db'
import { chat } from '../minimax'
import type { Message } from '../minimax'

const DRAFT_PROMPT = (name: string, research: {
  product_summary: string
  target_customer: string
  gtm_motion: string
  email_angle: string
}): Message[] => [
  {
    role: 'system',
    content: `You are a CMO writing a casual peer-to-peer cold email. No agency speak. No buzzwords. Short, direct, like you're texting a founder you met at a conference.`,
  },
  {
    role: 'user',
    content: `Write a cold email for this startup:

Company: ${name}
What they build: ${research.product_summary}
Who they sell to: ${research.target_customer}
Current GTM motion: ${research.gtm_motion}
One thing I noticed about them: ${research.email_angle}

Rules:
- 5-7 sentences max
- Line 1: specific observation about THEM, not a generic opener ("I noticed your X" or "Your approach to Y is interesting" — be more specific than that)
- Line 2-3: 2 sentences on why this matters or what problem they likely face
- Line 4: soft casual pitch on how we'd approach it — no hard sell, no "we help companies", just say what we'd do in plain terms
- Line 5: single CTA ("15 min?", "15 mins would be worth it", "worth a quick chat")
- Signature: "— Devesh"
- Zero buzzwords: no "revolutionize", "transform", "leverage", "synergy", "cutting-edge"
- Casual: like texting a peer, not pitching a client

Return ONLY the email: subject line on line 1, then a blank line, then the email body. No JSON, no explanation.`,
  },
]

export async function draftEmails(): Promise<number> {
  console.log('[Draft] Starting email drafting...')

  // Get all researched leads without email drafts
  const leads = await prisma.lead.findMany({
    where: {
      status: 'researched',
      email_draft: null,
    },
    include: {
      research: true,
    },
    take: 30,
  })

  let drafted = 0
  for (const lead of leads) {
    if (!lead.research) {
      console.log(`[Draft] Skipping ${lead.name} — no research doc`)
      continue
    }

    console.log(`[Draft] Drafting for ${lead.name}`)
    try {
      const response = await chat(
        DRAFT_PROMPT(lead.name, {
          product_summary: lead.research.product_summary,
          target_customer: lead.research.target_customer,
          gtm_motion: lead.research.gtm_motion,
          email_angle: lead.research.email_angle,
        }),
        0.8
      )

      // Parse: first line = subject, rest = body
      const lines = response.trim().split('\n').filter(Boolean)
      const subject = lines[0]?.replace(/^Subject:\s*/i, '').trim() ?? `Hey ${lead.name}`
      const body = lines.slice(1).join('\n').trim()

      await prisma.emailDraft.create({
        data: {
          lead_id: lead.id,
          subject,
          body,
          status: 'draft',
        },
      })

      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: 'drafted' },
      })

      await prisma.activityLog.create({
        data: {
          lead_id: lead.id,
          action: 'drafted',
          detail: `Email drafted: ${subject.slice(0, 50)}`,
        },
      })

      drafted++
    } catch (e) {
      console.error(`[Draft] Error ${lead.name}:`, e)
    }
  }

  console.log(`[Draft] Done: ${drafted} emails drafted`)
  return drafted
}