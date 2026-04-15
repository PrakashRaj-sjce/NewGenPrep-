"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [step, setStep] = useState<"email" | "otp" | "done">("email")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (data.success) {
        setStep("otp")
      } else {
        setError(data.detail || "Something went wrong")
      }
    } catch {
      setError("Failed to connect to server")
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, new_password: newPassword }),
      })
      const data = await res.json()
      if (data.success) {
        setStep("done")
      } else {
        setError(data.detail || "Invalid or expired code")
      }
    } catch {
      setError("Failed to connect to server")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center px-4">
      <h1 className="text-3xl font-bold text-white mb-2">Reset Password</h1>

      {step === "email" && (
        <>
          <p className="text-gray-400 mb-8">Enter your email to receive a verification code</p>
          <form onSubmit={handleSendOTP} className="w-full max-w-md space-y-4">
            {error && (
              <div className="p-3 bg-red-900/30 border border-red-700 text-red-400 rounded-md text-sm">{error}</div>
            )}
            <div>
              <Label htmlFor="email" className="text-gray-400 text-sm">Email</Label>
              <Input
                id="email" type="email" placeholder="Enter your email address"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-cyan-400"
                required
              />
            </div>
            <Button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-semibold" disabled={loading}>
              {loading ? "Sending..." : "Send Verification Code"}
            </Button>
            <p className="text-center">
              <Link href="/login" className="text-gray-500 hover:text-cyan-400 transition-colors">&larr; Back to Login</Link>
            </p>
          </form>
        </>
      )}

      {step === "otp" && (
        <>
          <p className="text-gray-400 mb-2">A 6-digit code was sent to <span className="text-cyan-400">{email}</span></p>
          <p className="text-gray-500 text-sm mb-8">Check your inbox and spam folder. Code expires in 15 minutes.</p>
          <form onSubmit={handleResetPassword} className="w-full max-w-md space-y-4">
            {error && (
              <div className="p-3 bg-red-900/30 border border-red-700 text-red-400 rounded-md text-sm">{error}</div>
            )}
            <div>
              <Label htmlFor="otp" className="text-gray-400 text-sm">Verification Code</Label>
              <Input
                id="otp" type="text" placeholder="Enter 6-digit code" maxLength={6}
                value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="mt-1 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-cyan-400 text-center text-2xl tracking-[0.5em] font-mono"
                required
              />
            </div>
            <div>
              <Label htmlFor="new-password" className="text-gray-400 text-sm">New Password</Label>
              <Input
                id="new-password" type="password" placeholder="Enter new password"
                value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-cyan-400"
                required
              />
            </div>
            <div>
              <Label htmlFor="confirm-password" className="text-gray-400 text-sm">Confirm Password</Label>
              <Input
                id="confirm-password" type="password" placeholder="Confirm new password"
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-cyan-400"
                required
              />
            </div>
            <Button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-semibold" disabled={loading}>
              {loading ? "Resetting..." : "Reset Password"}
            </Button>
            <p className="text-center">
              <button type="button" onClick={() => setStep("email")} className="text-gray-500 hover:text-cyan-400 transition-colors">
                &larr; Change email
              </button>
            </p>
          </form>
        </>
      )}

      {step === "done" && (
        <div className="w-full max-w-md text-center">
          <div className="p-4 bg-green-900/30 border border-green-700 text-green-400 rounded-md mb-4">
            Password reset successfully! You can now login with your new password.
          </div>
          <Link href="/login" className="inline-block px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-black font-semibold rounded-md transition-colors">
            Go to Login
          </Link>
        </div>
      )}
    </div>
  )
}
