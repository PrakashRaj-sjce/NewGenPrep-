"use client"

import { useState, useRef, useEffect } from "react"
import { UserIcon, MailIcon, LogOutIcon, ChevronDownIcon } from "@/components/icons"
import { useAuth } from "@/lib/auth-context"

export function UserProfileDropdown() {
  const { user, logout } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 transition-colors"
      >
        <div className="w-10 h-10 bg-cyan-500 rounded-full flex items-center justify-center text-black font-bold">
          {user?.name?.[0]?.toUpperCase() || "U"}
        </div>
        <div className="text-left hidden md:block">
          <div className="font-medium text-white">{user?.name || "User"}</div>
          <div className="text-sm text-gray-400">Interview Assistant</div>
        </div>
        <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-[#1c2128] border border-gray-700 rounded-lg shadow-xl z-50">
          {/* User Info Header */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-cyan-500 rounded-full flex items-center justify-center text-black font-bold text-lg">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </div>
              <div>
                <div className="font-semibold text-white">{user?.name || "User"}</div>
                <div className="text-sm text-gray-400 capitalize">{user?.role || "Candidate"}</div>
              </div>
            </div>
          </div>

          {/* User Details */}
          <div className="p-3">
            <div className="flex items-center gap-3 px-3 py-2 text-gray-300">
              <UserIcon className="w-4 h-4 text-gray-500" />
              <span className="text-sm">{user?.name || "User Profile"}</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 text-gray-300">
              <MailIcon className="w-4 h-4 text-gray-500" />
              <span className="text-sm truncate">{user?.email || "email@example.com"}</span>
            </div>
          </div>

          {/* Logout Button */}
          <div className="p-2 border-t border-gray-700">
            <button
              onClick={() => {
                setIsOpen(false)
                logout()
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <LogOutIcon className="w-4 h-4" />
              <span className="text-sm">Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
