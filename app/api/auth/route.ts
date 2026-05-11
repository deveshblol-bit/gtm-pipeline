import { NextResponse } from 'next/server'

const APP_PASSWORD = process.env.APP_PASSWORD || 'devesh'

export async function POST(request: Request) {
  const { password } = await request.json()
  if (password === APP_PASSWORD) {
    const res = NextResponse.json({ ok: true })
    res.cookies.set('gtm_auth', APP_PASSWORD, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })
    return res
  }
  return NextResponse.json({ error: 'Invalid' }, { status: 401 })
}