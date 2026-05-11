import { NextResponse } from 'next/server'
import { runDiscovery } from '@/lib/discovery/sources'

export async function POST() {
  try {
    const result = await runDiscovery()
    return NextResponse.json({ ok: true, ...result })
  } catch (e: any) {
    console.error('[Cron/Discover]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}