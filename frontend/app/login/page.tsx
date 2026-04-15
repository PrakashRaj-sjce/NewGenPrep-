"use client"

import Link from "next/link"
import { UserIcon, BriefcaseIcon } from "@/components/icons"
import { Button } from "@/components/ui/button"

export default function LoginOptionsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center px-4">

      {/* Heading */}
      <h1 className="text-4xl font-bold text-white mb-2">Welcome Back</h1>
      <p className="text-gray-400 mb-12">Choose your account type to continue</p>

      {/* Role Selection Cards */}
      <div className="flex flex-col md:flex-row gap-6 w-full max-w-2xl">

        {/* Job Seeker Card */}
        <div className="flex-1 border border-gray-700 rounded-xl p-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-cyan-900/30 rounded-full flex items-center justify-center mb-6">
            <UserIcon className="w-8 h-8 text-cyan-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Job Seeker</h2>
          <p className="text-gray-500 text-sm mb-6">
            Practice interviews and improve your skills with AI-powered feedback
          </p>

          <Link href="/login/candidate" className="w-full">
            <Button className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-semibold">
              Login as Job Seeker
            </Button>
          </Link>
        </div>

        {/* HR / Recruiter Card */}
        <div className="flex-1 border border-gray-700 rounded-xl p-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mb-6">
            <BriefcaseIcon className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">HR / Recruiter</h2>
          <p className="text-gray-500 text-sm mb-6">
            Manage candidates and streamline your hiring process efficiently
          </p>

          <Link href="/login/hr" className="w-full">
            <Button className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-semibold">
              Login as HR
            </Button>
          </Link>
        </div>
      </div>

      {/* Sign Up Link */}
      <p className="mt-8 text-gray-500">
        {"Don't have an account? "}
        <Link href="/signup" className="text-cyan-400 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  )
}