import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const APP_PASSWORD = process.env.APP_PASSWORD || 'devesh'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow login, API routes, Next.js internals, and static files
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Check auth cookie
  const cookie = request.cookies.get('gtm_auth')
  if (!cookie || cookie.value !== APP_PASSWORD) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!login|api|_next|favicon).*)'],
}