"use client"

import type React from "react"

import { useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: ("candidate" | "hr")[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        const search = searchParams?.toString()
        const redirectTo = search ? `${pathname}?${search}` : pathname
        router.replace(`/login?redirect=${encodeURIComponent(redirectTo)}`)
      } else if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        // Redirect to appropriate dashboard based on role
        router.replace(user.role === "hr" ? "/dashboard/hr" : "/dashboard/candidate")
      }
    }
  }, [loading, isAuthenticated, user, allowedRoles, router, pathname, searchParams])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return null
  }

  return <>{children}</>
}
