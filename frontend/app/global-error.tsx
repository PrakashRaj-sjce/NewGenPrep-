"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Global error:", error)
  }, [error])

  return (
    <html>
      <body className="bg-[#0a0a0f]">
        <div className="min-h-screen flex flex-col items-center justify-center px-4 text-white">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold mb-3">Something went wrong</h2>
          <p className="text-gray-400 text-center max-w-md mb-6">
            An unexpected error occurred. This has been logged and we are working on a fix.
          </p>
          <div className="flex gap-4">
            <Button
              onClick={() => reset()}
              className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold px-6"
            >
              Try Again
            </Button>
            <Button
              onClick={() => window.location.href = "/"}
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800 px-6"
            >
              Go Home
            </Button>
          </div>
          <p className="mt-8 text-gray-600 text-xs">
            Error ID: {error.digest || "unknown"}
          </p>
        </div>
      </body>
    </html>
  )
}
