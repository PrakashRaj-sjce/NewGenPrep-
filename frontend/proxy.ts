import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * NewGenPrep - Route Proxy (Next.js 16 compatible)
 * Handles server-side route protection and redirects.
 * Ensures proper navigation behavior for back/forward buttons.
 */

// Routes that require authentication
const protectedPaths = ["/dashboard"]
// Routes only for non-authenticated users
const authPaths = ["/login", "/signup", "/forgot-password"]

export function GET(request: NextRequest) {
  return handleRequest(request)
}

export function POST(request: NextRequest) {
  return handleRequest(request)
}

function handleRequest(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Let API routes and static files pass through
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  // Check for auth token in cookies or authorization header
  const token = request.cookies.get("authToken")?.value

  // Protected routes: redirect to login if no token
  if (protectedPaths.some((path) => pathname.startsWith(path))) {
    if (!token) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("redirect", pathname)
      return NextResponse.next() // Don't hard redirect - let client-side ProtectedRoute handle it
    }
  }

  // Auth routes: if already logged in, redirect to dashboard
  // (We let client-side handle this since token is in localStorage, not cookies)

  const response = NextResponse.next()

  // Add cache control for proper back/forward behavior
  response.headers.set("Cache-Control", "no-store, must-revalidate")
  response.headers.set("X-Robots-Tag", "noindex, nofollow") // Protect dashboard from crawlers

  return response
}

// Also export as middleware for backward compatibility with Next.js 15
export const middleware = handleRequest

export const config = {
  // Only run middleware on page routes, not static files
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon).*)"],
}
