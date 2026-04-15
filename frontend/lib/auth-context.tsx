"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { api } from "./api"

interface User {
  id: string
  email: string
  role: "candidate" | "hr"
  name?: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string, role: "candidate" | "hr") => Promise<boolean>
  signup: (
    email: string,
    password: string,
    name: string,
    role: "candidate" | "hr"
  ) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  isAuthenticated: boolean
  error: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const STORAGE_KEY = "interview_bot_user"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem("authToken")
      setToken(storedToken)

      // First try to get user from API (token-based auth)
      if (storedToken) {
        try {
          const response = await api.getCurrentUser()
          if (response?.user) {
            setUser(response.user)
            localStorage.setItem(STORAGE_KEY, JSON.stringify(response.user))
            setLoading(false)
            return
          }
        } catch (err) {
          // Only invalidate the token when we are confident auth is invalid.
          // Network errors / transient backend issues should NOT log the user out.
          if (err instanceof Error && err.message.toLowerCase().includes("unauthorized")) {
            localStorage.removeItem("authToken")
            setToken(null)
          }
        }
      }

      // Fallback to localStorage ONLY if no token was attempted or it failed gracefully
      // But if we want real auth, we should probably require a token.
      // For now, only restore session if we have a token (or if we really want demo mode).
      // Given the user wants "Real Logic", let's be strict: NO TOKEN = NO SESSION (mostly).

      const stored = localStorage.getItem(STORAGE_KEY)
      // Only restore user if we also have a token.
      if (stored && (storedToken || localStorage.getItem("authToken"))) {
        try {
          setUser(JSON.parse(stored))
        } catch {
          localStorage.removeItem(STORAGE_KEY)
        }
      }
      
      // Crucial: Only set loading to false AFTER all sync parsing is done
      setLoading(false)
    }

    checkAuth()
  }, [])

  // Login function - calls real API
  const login = async (email: string, password: string, role: "candidate" | "hr"): Promise<boolean> => {
    setError(null)

    try {
      const response = await api.login(email, password)

      if (response.success && response.user && response.token) {
        // Verify role matches
        if (response.user.role !== role) {
          setError(`This account is registered as ${response.user.role}. Please use the correct login.`)
          return false
        }

        // mandatory token storage
        localStorage.setItem("authToken", response.token)
        setToken(response.token)
        console.log("Auth token saved via login")

        // --- BRIDGE LOGIC: Signal the extension ---
        if (typeof window !== "undefined") {
          const message = {
            type: "AUTH_SUCCESS",
            token: response.token,
            user: response.user,
          }
          // Signal to opener (if popup)
          window.opener?.postMessage(message, "*")
          // Also try to send to any extension listeners if we are in a tab
          window.postMessage(message, "*")
        }
        // --- END BRIDGE LOGIC ---

        setUser(response.user)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(response.user))
        return true
      }

      setError("Login failed. Please check your credentials.")
      return false
    } catch (err) {
      console.error("API login failed:", err)
      setError("Invalid email or password. If you don't have an account, please Sign Up first.")
      return false
    }
  }

  // Signup function - calls real API
  const signup = async (email: string, password: string, name: string, role: "candidate" | "hr")
    : Promise<{ success: boolean; error?: string }> => {
    setError(null)

    try {
      const response = await api.register({ email, password, name, role })

      if (response.success) {
        return { success: true }
      }

      const msg = "Registration failed. Please try again."
      setError(msg)
      return { success: false, error: msg }
    } catch (err: unknown) {
      // Use the actual error message from API (which we fixed in api.ts to read 'detail')
      const errorMessage = err instanceof Error ? err.message : "Registration failed"

      console.error("API signup failed:", errorMessage)
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  // Logout function
  const logout = async () => {
    try {
      await api.logout()
    } catch {
      // Continue with local logout even if API fails
    }
    setUser(null)
    setToken(null)
    setError(null)
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem("authToken")
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        signup,
        logout,
        isAuthenticated: !!token,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
