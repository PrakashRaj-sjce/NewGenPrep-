"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { UserIcon, BriefcaseIcon } from "@/components/icons"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"

export default function SignupPage() {
  const router = useRouter()
  const { signup, error: authError } = useAuth()
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    role: "candidate" as "candidate" | "hr",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    if (formData.name.length < 2) {
      setError("Name must be at least 2 characters")
      return
    }

    setLoading(true)

    try {
      const result = await signup(formData.email, formData.password, formData.name, formData.role)
      if (result.success) {
        // Redirect to login page instead of dashboard
        router.push("/login?signup=success")
      } else {
        // Show the specific error return from the context
        setError(result.error || "Failed to create account")
      }
    } catch {
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="w-16 h-16 bg-cyan-900/30 rounded-full flex items-center justify-center mb-6">
        <UserIcon className="w-8 h-8 text-cyan-400" />
      </div>

      <h1 className="text-3xl font-bold text-cyan-400 mb-2">Create Account</h1>
      <p className="text-gray-400 mb-8">Join the NewGenPrep platform</p>

      <div className="w-full max-w-md">
        {/* Role Selection */}
        <div className="flex gap-4 mb-6">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, role: "candidate" })}
            className={`flex-1 p-4 rounded-lg border-2 transition-all ${formData.role === "candidate"
              ? "border-cyan-500 bg-cyan-500/10"
              : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
              }`}
          >
            <UserIcon
              className={`w-6 h-6 mx-auto mb-2 ${formData.role === "candidate" ? "text-cyan-400" : "text-gray-400"}`}
            />
            <p className={`text-sm font-medium ${formData.role === "candidate" ? "text-cyan-400" : "text-gray-400"}`}>
              Job Seeker
            </p>
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, role: "hr" })}
            className={`flex-1 p-4 rounded-lg border-2 transition-all ${formData.role === "hr"
              ? "border-green-500 bg-green-500/10"
              : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
              }`}
          >
            <BriefcaseIcon
              className={`w-6 h-6 mx-auto mb-2 ${formData.role === "hr" ? "text-green-400" : "text-gray-400"}`}
            />
            <p className={`text-sm font-medium ${formData.role === "hr" ? "text-green-400" : "text-gray-400"}`}>
              HR / Recruiter
            </p>
          </button>
        </div>

        {(error || authError) && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700 text-red-400 rounded-md text-sm">
            {error || authError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-gray-400 text-sm">
              Full Name
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-cyan-400"
              required
            />
          </div>

          <div>
            <Label htmlFor="email" className="text-gray-400 text-sm">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="mt-1 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-cyan-400"
              required
            />
          </div>

          <div>
            <Label htmlFor="password" className="text-gray-400 text-sm">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="mt-1 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-cyan-400 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Must be at least 6 characters
            </p>
          </div>

          <Button
            type="submit"
            className={`w-full font-semibold py-3 ${formData.role === "hr"
              ? "bg-green-500 hover:bg-green-600 text-black"
              : "bg-cyan-500 hover:bg-cyan-600 text-black"
              }`}
            disabled={loading}
          >
            {loading ? "Creating account..." : `Sign Up as ${formData.role === "hr" ? "HR" : "Candidate"}`}
          </Button>
        </form>

        <p className="mt-8 text-center text-gray-500">
          {"Already have an account? "}
          <Link href="/login" className="text-cyan-400 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  )
}
