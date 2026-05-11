import { prisma } from '../db'
import { chat } from '../minimax'
import type { Message } from '../minimax'

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
// YC LAUNCH — new YC companies coming out of batch
// https://www.ycombinator.com/launches/
// ──────────────────────────────────────────────

export async function discoverYCLaunch(): Promise<DiscoveredLead[]> {
  try {
    const res = await fetch('https://www.ycombinator.com/launches/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
    })
    const html = await res.text()
    // Each launch card has a company name + link pattern
    const matches = [...html.matchAll(/href="(\/launches\/[^"]+)">\s*([^<]+)\s*<\/a>\s*<\/h3>/g)]
    const seen = new Set<string>()
    const leads: DiscoveredLead[] = []
    for (const m of matches.slice(0, 50)) {
      const name = m[2].trim()
      if (!name || seen.has(name)) continue
      seen.add(name)
      leads.push({
        name,
        url: `https://www.ycombinator.com${m[1]}`,
        description: null,
        source: 'yc_launch',
      })
    }
    // Fallback: look for any company name in launch links
    if (leads.length === 0) {
      const fallback = [...html.matchAll(/href="(\/launches\/[a-z0-9-]+)">([^<]+)<\/a>/gi)]
      for (const m of fallback.slice(0, 30)) {
        const name = m[2].trim()
        if (!name || seen.has(name)) continue
        seen.add(name)
        leads.push({
          name,
          url: `https://www.ycombinator.com${m[1]}`,
          description: null,
          source: 'yc_launch',
        })
      }
    }
    return leads
  } catch (e) {
    console.error('YC Launch error:', e)
    return []
  }
}

// ──────────────────────────────────────────────
// YC DEMO DAY — companies from recent batches
// Uses HN Algolia to find YC demo day announcements
// ──────────────────────────────────────────────

export async function discoverYCDemoDay(): Promise<DiscoveredLead[]> {
  try {
    // Search HN for recent YC demo day posts
    const res = await fetch(
      `https://hn.algolia.com/api/v1/search?query=ycombinator%20demo%20day&tags=story&hitsPerPage=30`
    )
    const data = await res.json()
    const seen = new Set<string>()
    const leads: DiscoveredLead[] = []
    for (const hit of data.hits ?? []) {
      const title = hit.title ?? ''
      // Extract company name — often "Company Name (YC W24 Demo Day)" or similar
      const match = title.match(/^([^(]+?)\s*(?:\(|YC)/)
      if (match) {
        const name = match[1].trim().replace(/^YC\s+/i, '')
        if (name && name.length > 2 && name.length < 60 && !seen.has(name)) {
          seen.add(name)
          leads.push({
            name,
            url: hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`,
            description: title,
            source: 'yc_demoday',
          })
        }
      }
    }
    return leads
  } catch (e) {
    console.error('YC Demo Day error:', e)
    return []
  }
}

// ──────────────────────────────────────────────
// YC HIRING — YC founder job postings
// ──────────────────────────────────────────────

export async function discoverYCHiring(): Promise<DiscoveredLead[]> {
  try {
    // YC founder jobs board
    const res = await fetch('https://www.ycombinator.com/jobs/board/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
    })
    const html = await res.text()
    const matches = [...html.matchAll(/href="(\/companies\/[^"]+)">([^<]+)<\/a>/g)]
    const seen = new Set<string>()
    const leads: DiscoveredLead[] = []
    for (const m of matches.slice(0, 50)) {
      const name = m[2].trim()
      if (!name || seen.has(name)) continue
      seen.add(name)
      leads.push({
        name,
        url: `https://www.ycombinator.com${m[1]}`,
        description: null,
        source: 'yc_hiring',
      })
    }
    return leads
  } catch (e) {
    console.error('YC Hiring error:', e)
    return []
  }
}

// ──────────────────────────────────────────────
// CRUNCHBASE — public startup/discovery pages
// ──────────────────────────────────────────────

export async function discoverCrunchbase(): Promise<DiscoveredLead[]> {
  try {
    // Crunchbase Discover page — new startups
    const res = await fetch('https://www.crunchbase.com/discover/home', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    })
    const html = await res.text()
    // Crunchbase company cards have data-id or slug patterns
    const matches = [...html.matchAll(/href="\/organization\/([^"]+)"/g)]
    const seen = new Set<string>()
    const leads: DiscoveredLead[] = []
    for (const m of [...new Set(matches.map((m) => m[1]))].slice(0, 40)) {
      const slug = m.trim()
      if (!slug || seen.has(slug)) continue
      seen.add(slug)
      const name = slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      leads.push({
        name,
        url: `https://www.crunchbase.com/organization/${slug}`,
        description: null,
        source: 'crunchbase',
      })
    }
    return leads
  } catch (e) {
    console.error('Crunchbase error:', e)
    return []
  }
}

// ──────────────────────────────────────────────
// REMOTIVE — startup jobs board (remote-friendly)
// ──────────────────────────────────────────────

export async function discoverRemotive(): Promise<DiscoveredLead[]> {
  try {
    const res = await fetch('https://remotive.com/api/remote-jobs?category=software-dev&limit=50', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    const data = await res.json()
    const seen = new Set<string>()
    const leads: DiscoveredLead[] = []
    for (const job of data.jobs ?? []) {
      const company = job.company_name?.trim()
      const url = job.url ?? null
      if (!company || seen.has(company)) continue
      seen.add(company)
      leads.push({
        name: company,
        url,
        description: job.title ? `${job.title} — ${job.description?.slice(0, 120) ?? ''}` : null,
        source: 'remotive',
      })
    }
    return leads
  } catch (e) {
    console.error('Remotive error:', e)
    return []
  }
}

// ──────────────────────────────────────────────
// /R STARTUP JOBS — Reddit community job board
// ──────────────────────────────────────────────

export async function discoverRedditStartups(): Promise<DiscoveredLead[]> {
  try {
    // Fetch hot posts from r/startups
    const res = await fetch('https://www.reddit.com/r/startups/hot.json?limit=30', {
      headers: { 'User-Agent': 'GTM-Pipeline/1.0' },
    })
    const data = await res.json()
    const seen = new Set<string>()
    const leads: DiscoveredLead[] = []
    for (const child of data.data?.children ?? []) {
      const post = child.data
      const title = post.title ?? ''
      const url = post.url ?? null
      // Extract company name from post title (usually "Hiring [Company]: ... " or "[Company] is hiring...")
      const match = title.match(/(?:hiring\s+)?([A-Z][A-Za-z0-9 &]+)(?:\s+[-:|]|\s+is\s+hiring|\s+\()/i)
      if (match) {
        const name = match[1].trim().slice(0, 50)
        if (name && name.length > 2 && !seen.has(name)) {
          seen.add(name)
          leads.push({
            name,
            url,
            description: title,
            source: 'reddit_startups',
          })
        }
      }
    }
    return leads
  } catch (e) {
    console.error('Reddit Startups error:', e)
    return []
  }
}

// ──────────────────────────────────────────────
// VC PORTFOLIO NEWSPIPES — recent portfolio updates
// ──────────────────────────────────────────────

export async function discoverVCPortfolios(): Promise<DiscoveredLead[]> {
  try {
    // Product Hunt collections for "VC backed" or recent launches
    const res = await fetch(
      'https://news.ycombinator.com/newest?points=100&front_page_hot_date_range=p7d'
    )
    const html = await res.text()
    const matches = [...html.matchAll(/href="(https?:\/\/(?!news\.ycombinator|google|github)[^"]+)"/g)]
    const seen = new Set<string>()
    const leads: DiscoveredLead[] = []
    for (const m of matches.slice(0, 30)) {
      const url = m[1]
      try {
        const u = new URL(url)
        const name = u.hostname.replace(/^www\./, '').split('.')[0]
        if (name && !seen.has(name) && name.length > 2) {
          seen.add(name)
          leads.push({
            name: name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            url,
            description: null,
            source: 'vc_portfolio',
          })
        }
      } catch {}
    }
    return leads
  } catch (e) {
    console.error('VC Portfolio error:', e)
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

  const [ph, yc, yc_launch, yc_demoday, yc_hire, tc, ih, hn, al, cb, remote, reddit, vc] =
    await Promise.allSettled([
      discoverProductHunt(),
      discoverYCCompanies(),
      discoverYCLaunch(),
      discoverYCDemoDay(),
      discoverYCHiring(),
      discoverTechCrunch(),
      discoverIndieHackers(),
      discoverHackerNews(),
      discoverAngelList(),
      discoverCrunchbase(),
      discoverRemotive(),
      discoverRedditStartups(),
      discoverVCPortfolios(),
    ])

  const all: DiscoveredLead[] = [
    ...(ph.status === 'fulfilled' ? ph.value : []),
    ...(yc.status === 'fulfilled' ? yc.value : []),
    ...(yc_launch.status === 'fulfilled' ? yc_launch.value : []),
    ...(yc_demoday.status === 'fulfilled' ? yc_demoday.value : []),
    ...(yc_hire.status === 'fulfilled' ? yc_hire.value : []),
    ...(tc.status === 'fulfilled' ? tc.value : []),
    ...(ih.status === 'fulfilled' ? ih.value : []),
    ...(hn.status === 'fulfilled' ? hn.value : []),
    ...(al.status === 'fulfilled' ? al.value : []),
    ...(cb.status === 'fulfilled' ? cb.value : []),
    ...(remote.status === 'fulfilled' ? remote.value : []),
    ...(reddit.status === 'fulfilled' ? reddit.value : []),
    ...(vc.status === 'fulfilled' ? vc.value : []),
  ]

  // BetaList separate to avoid blocking
  const betalist = await discoverBetaList()
  all.push(...betalist)

  console.log(`[Discovery] Found ${all.length} leads, saving...`)
  const saved = await saveLeads(all)

  return { total: all.length, saved }
}