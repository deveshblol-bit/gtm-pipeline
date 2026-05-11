import { NextResponse } from 'next/server'
import { draftEmails } from '@/lib/email/drafting'

export async function POST() {
  try {
    const count = await draftEmails()
    return NextResponse.json({ ok: true, drafted: count })
  } catch (e: any) {
    console.error('[Cron/Draft]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}