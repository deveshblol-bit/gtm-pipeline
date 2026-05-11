import { prisma } from '../db'
import { chat } from '../minimax'
import type { MiniMaxMessage } from '../minimax'

interface DiscoveredLead {
  name: string
  url: string | null
  description: string | null
  source: string
  logo_url?: string | null
}

interface ResearchResult {
  product_summary: string
  target_customer: string
  gtm_motion: string
  positioning: string
  gtm_signal: string
  red_flags: string | null
  email_angle: string
  confidence: 'high' | 'medium' | 'low'
}

// ──────────────────────────────────────────────
// DISCOVERY SOURCES
// ──────────────────────────────────────────────

export async function discoverProductHunt(): Promise<DiscoveredLead[]> {
  try {
    const res = await fetch('https://api.producthunt.com/v2/api/graphql', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer YOUR_PH_API_KEY',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `{
          posts(first: 30, postedAfter: "${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()}") {
            edges {
              node {
                name
                website
                tagline
                logoUrl
              }
            }
          }
        }`,
      }),
    })
    const data = await res.json()
    return (data.data?.posts?.edges ?? []).map((e: any) => ({
      name: e.node.name,
      url: e.node.website,
      description: e.node.tagline,
      source: 'producthunt',
      logo_url: e.node.logoUrl,
    }))
  } catch (e) {
    console.error('ProductHunt error:', e)
    return []
  }
}

export async function discoverBetaList(): Promise<DiscoveredLead[]> {
  try {
    const res = await fetch('https://betalist.com/signal/new_startups?page=1', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    const html = await res.text()
    // Parse with cheerio-like approach — manual regex extraction
    const matches = [...html.matchAll(/<a href="(\/startups\/[^"]+)">([^<]+)<\/a>/g)]
    const leads: DiscoveredLead[] = []
    for (const m of matches.slice(0, 20)) {
      leads.push({
        name: m[2].trim(),
        url: `https://betalist.com${m[1]}`,
        description: null,
        source: 'betalist',
      })
    }
    return leads
  } catch (e) {
    console.error('BetaList error:', e)
    return []
  }
}

export async function discoverYCCompanies(): Promise<DiscoveredLead[]> {
  try {
    const res = await fetch('https://www.ycombinator.com/companies/', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    const html = await res.text()
    // Extract company names and URLs from the page
    const matches = [...html.matchAll(/href="\/companies\/([^"]+)">([^<]+)<\/a>/g)]
    const leads: DiscoveredLead[] = []
    for (const m of matches.slice(0, 100)) {
      const slug = m[1]
      leads.push({
        name: m[2].trim(),
        url: `https://www.ycombinator.com/companies/${slug}/`,
        description: null,
        source: 'yc',
      })
    }
    return leads
  } catch (e) {
    console.error('YC error:', e)
    return []
  }
}

export async function discoverTechCrunch(): Promise<DiscoveredLead[]> {
  try {
    const res = await fetch('https://techcrunch.com/feed/', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    const xml = await res.text()
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 20)
    const leads: DiscoveredLead[] = []
    for (const item of items) {
      const content = item[1]
      const title = content.match(/<title>([^<]+)<\/title>/)?.[1] ?? ''
      const link = content.match(/<link>([^<]+)<\/link>/)?.[1] ?? ''
      // Only funding-related articles
      if (title && link) {
        leads.push({
          name: title.replace(/^Funding round|/g, '').trim(),
          url: link,
          description: null,
          source: 'techcrunch',
        })
      }
    }
    return leads
  } catch (e) {
    console.error('TechCrunch error:', e)
    return []
  }
}

export async function discoverIndieHackers(): Promise<DiscoveredLead[]> {
  try {
    const res = await fetch('https://feed.indiehackers.com/', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    const xml = await res.text()
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 20)
    const leads: DiscoveredLead[] = []
    for (const item of items) {
      const content = item[1]
      const title = content.match(/<title>([^<]+)<\/title>/)?.[1] ?? ''
      const link = content.match(/<link>([^<]+)<\/link>/)?.[1] ?? ''
      if (title && link) {
        leads.push({
          name: title,
          url: link,
          description: null,
          source: 'indiehackers',
        })
      }
    }
    return leads
  } catch (e) {
    console.error('IndieHackers error:', e)
    return []
  }
}

export async function discoverHackerNews(): Promise<DiscoveredLead[]> {
  try {
    // Use HN Algolia API to search for "who is hiring" posts
    const res = await fetch(
      'https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=20'
    )
    const data = await res.json()
    return (data.hits ?? []).map((h: any) => ({
      name: h.title ?? 'HN Article',
      url: h.url ?? `https://news.ycombinator.com/item?id=${h.objectID}`,
      description: h.title ?? null,
      source: 'hn',
    }))
  } catch (e) {
    console.error('HN error:', e)
    return []
  }
}

export async function discoverAngelList(): Promise<DiscoveredLead[]> {
  try {
    const res = await fetch('https://angel.co/jobs', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    const html = await res.text()
    // Extract startup names from job listings
    const matches = [...html.matchAll(/data-startup-slug="([^"]+)"/g)]
    const slugs = [...new Set(matches.map((m) => m[1]))]
    return slugs.slice(0, 30).map((slug) => ({
      name: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      url: `https://angel.co/${slug}`,
      description: null,
      source: 'angellist',
    }))
  } catch (e) {
    console.error('AngelList error:', e)
    return []
  }
}

// ──────────────────────────────────────────────
// SAVE LEADS TO DB (dedup by source+name)
// ──────────────────────────────────────────────

export async function saveLeads(leads: DiscoveredLead[]): Promise<number> {
  let saved = 0
  for (const lead of leads) {
    if (!lead.name) continue
    const existing = await prisma.lead.findFirst({
      where: { name: lead.name, source: lead.source },
    })
    if (!existing) {
      await prisma.lead.create({
        data: {
          name: lead.name,
          url: lead.url,
          description: lead.description,
          source: lead.source,
          logo_url: lead.logo_url,
          status: 'discovered',
          score: 0,
        },
      })
      saved++
    }
  }
  return saved
}

// ──────────────────────────────────────────────
// RUN ALL DISCOVERY
// ──────────────────────────────────────────────

export async function runDiscovery(): Promise<{ total: number; saved: number }> {
  console.log('[Discovery] Starting all sources...')

  const [ph, yc, tc, ih, hn, al] = await Promise.allSettled([
    discoverProductHunt(),
    discoverYCCompanies(),
    discoverTechCrunch(),
    discoverIndieHackers(),
    discoverHackerNews(),
    discoverAngelList(),
  ])

  const all: DiscoveredLead[] = [
    ...(ph.status === 'fulfilled' ? ph.value : []),
    ...(yc.status === 'fulfilled' ? yc.value : []),
    ...(tc.status === 'fulfilled' ? tc.value : []),
    ...(ih.status === 'fulfilled' ? ih.value : []),
    ...(hn.status === 'fulfilled' ? hn.value : []),
    ...(al.status === 'fulfilled' ? al.value : []),
  ]

  // BetaList separate to avoid blocking
  const betalist = await discoverBetaList()
  all.push(...betalist)

  console.log(`[Discovery] Found ${all.length} leads, saving...`)
  const saved = await saveLeads(all)

  return { total: all.length, saved }
}