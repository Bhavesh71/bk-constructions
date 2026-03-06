import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname

    // Admin-only routes (/settings is accessible to all roles — the page itself
    // renders role-appropriate content; only /users is truly admin-only)
    const adminRoutes = ['/users']
    const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route))

    if (isAdminRoute && token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: ['/dashboard/:path*', '/sites/:path*', '/daily-entry/:path*', '/records/:path*', '/labour/:path*', '/materials/:path*', '/reports/:path*', '/users/:path*', '/settings/:path*'],
}
