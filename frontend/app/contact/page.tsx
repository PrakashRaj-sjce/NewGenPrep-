"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission
    console.log("Form submitted:", formData)
    alert("Message sent! We'll get back to you shortly.")
    setFormData({ name: "", email: "", message: "" })
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center px-4">
      {/* Contact Us Badge */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-3 h-3 bg-green-500 rounded-full" />
        <span className="text-gray-400">Contact Us</span>
      </div>

      {/* Heading */}
      <h1 className="text-4xl font-bold text-white mb-4">Get in Touch</h1>
      <p className="text-gray-400 text-center max-w-md mb-8">
        Have questions about our AI interview bot? We would love to hear from you. Send us a message and our team will
        get back to you shortly.
      </p>

      {/* Contact Form */}
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
        <div>
          <Label htmlFor="name" className="text-gray-400 text-sm mb-2 block">
            Name
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="Your name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-cyan-400"
            required
          />
        </div>

        <div>
          <Label htmlFor="email" className="text-gray-400 text-sm mb-2 block">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-cyan-400"
            required
          />
        </div>

        <div>
          <Label htmlFor="message" className="text-gray-400 text-sm mb-2 block">
            Message
          </Label>
          <Textarea
            id="message"
            placeholder="Tell us how we can help..."
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-cyan-400 min-h-[120px]"
            required
          />
        </div>

        <Button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-semibold py-3">
          Send Message
        </Button>
      </form>

      {/* Back Link */}
      <Link href="/" className="mt-8 text-gray-500 hover:text-cyan-400 transition-colors">
        &larr; Back to Home
      </Link>
    </div>
  )
}
