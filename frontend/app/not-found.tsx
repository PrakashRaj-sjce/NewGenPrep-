"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center px-4">
      {/* Animated 404 */}
      <div className="relative mb-8">
        <h1 className="text-[120px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 leading-none select-none">
          404
        </h1>
        <div className="absolute inset-0 text-[120px] font-bold text-cyan-500/10 blur-2xl leading-none select-none">
          404
        </div>
      </div>

      <h2 className="text-2xl font-semibold text-white mb-3">Page Not Found</h2>
      <p className="text-gray-400 text-center max-w-md mb-8">
        The page you are looking for does not exist or has been moved.
        Let us get you back on track.
      </p>

      <div className="flex gap-4">
        <Link href="/">
          <Button className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold px-6">
            Go Home
          </Button>
        </Link>
        <Link href="/login">
          <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800 px-6">
            Login
          </Button>
        </Link>
      </div>

      <p className="mt-12 text-gray-600 text-sm">NewGenPrep AI Interview Platform</p>
    </div>
  )
}
