import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const url = request.nextUrl
  const hostname = request.headers.get('host') || ''
  const protocol = request.headers.get('x-forwarded-proto') || 'http'

  // Skip redirect for localhost
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1') || hostname.includes(':')) {
    return NextResponse.next()
  }

  // Check if we need to redirect
  const needsRedirect = 
    hostname !== 'www.texcoco.xyz' || // Not the correct host
    protocol !== 'https' // Not HTTPS

  if (needsRedirect) {
    // Create the new URL with the correct host and protocol
    const newUrl = new URL(url.pathname + url.search, 'https://www.texcoco.xyz')
    
    // Return a 301 (permanent) redirect
    return NextResponse.redirect(newUrl, {
      status: 301,
    })
  }

  return NextResponse.next()
}

// Configure which paths this middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
} 