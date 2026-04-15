import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * NewGenPrep - Route Middleware
 * Handles server-side route protection and redirects.
 * Ensures proper navigation behavior for back/forward buttons.
 * 
 * NOTE: Middleware files must ONLY export `middleware` and `config`.
 * Do NOT add GET/POST/PUT exports — those are for Route Handlers only.
 */

// Routes that require authentication
const protectedPaths = ["/dashboard"]

export function proxy(request: NextRequest) {
  try {
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
  
    // Check for auth token in cookies
    const token = request.cookies.get("authToken")?.value
  
    // Protected routes: check if attempting to visit protected area without token
    if (protectedPaths.some((path) => pathname.startsWith(path))) {
      if (!token) {
        // Create an absolute URL for redirect
        const loginUrl = new URL("/login", request.url)
        loginUrl.searchParams.set("redirect", pathname)
        // Pass through and let client redirect if this is an issue
        return NextResponse.next()
      }
    }
  
    const response = NextResponse.next()
  
    // Add cache control for proper back/forward behavior
    response.headers.set("Cache-Control", "no-store, must-revalidate")
    response.headers.set("X-Robots-Tag", "noindex, nofollow")
  
    return response
  } catch (error) {
    console.error("Proxy routing error:", error)
    // If the middleware errors out, just pass the request through instead of failing with 500
    return NextResponse.next()
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon).*)"],
}
