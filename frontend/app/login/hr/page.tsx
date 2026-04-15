"use client"

import type React from "react"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { BriefcaseIcon } from "@/components/icons"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/lib/auth-context"

export default function HRLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, error: authError } = useAuth()
  const [formData, setFormData] = useState({ email: "", password: "", rememberMe: false })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const success = await login(formData.email, formData.password, "hr")
      if (success) {
        const redirect = searchParams.get("redirect")
        if (redirect && redirect.startsWith("/")) {
          router.push(redirect)
        } else {
          router.push("/dashboard/hr")
        }
      } else {
        setError(authError || "Invalid email or password")
      }
    } catch {
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center px-4">
      {/* HR Icon */}
      <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mb-6">
        <BriefcaseIcon className="w-8 h-8 text-green-400" />
      </div>

      {/* Heading */}
      <h1 className="text-3xl font-bold text-cyan-400 mb-2">HR Login</h1>
      <p className="text-gray-400 mb-8">Manage candidates and streamline your hiring process</p>

      {(error || authError) && (
        <div className="w-full max-w-md mb-4 p-3 bg-red-900/30 border border-red-700 text-red-400 rounded-md text-sm">
          {error || authError}
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
        <div>
          <Label htmlFor="email" className="text-gray-400 text-sm">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email address"
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
              placeholder="Enter your password"
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
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              id="remember"
              checked={formData.rememberMe}
              onCheckedChange={(checked) => setFormData({ ...formData, rememberMe: checked })}
            />
            <Label htmlFor="remember" className="text-gray-400 text-sm cursor-pointer">
              Remember me
            </Label>
          </div>
          <Link href="/forgot-password" className="text-cyan-400 text-sm hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-semibold py-3"
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </Button>
      </form>

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
