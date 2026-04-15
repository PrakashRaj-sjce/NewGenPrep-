"use client"

import { useCallback } from "react"

import { useEffect } from "react"

import { useRef } from "react"

import { useState } from "react"

import type React from "react"
import type { InterviewHistory, UserStats } from "@/types" // Import InterviewHistory and UserStats types
import {
  HomeIcon,
  UploadIcon,
  InboxIcon,
  BarChartIcon,
  LayoutDashboardIcon,
  HistoryIcon,
  SparklesIcon,
  SettingsIcon,
  MoonIcon,
  SunIcon,
  MaximizeIcon,
  Minimize2Icon,
  MicOffIcon,
  MicIcon,
  FileTextIcon,
  MenuIcon,
  XIcon,
  ClockIcon,
  TrendingUpIcon,
  AwardIcon,
  Loader2Icon,
  PlayIcon,
  CalendarIcon,
} from "@/components/icons"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { useTheme } from "@/lib/theme-context"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/protected-route"
import { UserProfileDropdown } from "@/components/user-profile-dropdown"
import { InterviewChat } from "@/components/interview-chat"
import { PracticeInterview } from "@/components/practice-interview"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

import { Schedule } from "@/lib/api"

type DashboardView = "home" | "upload" | "inbox" | "reports" | "dashboard" | "history" | "practice" | "schedule"

export default function CandidateDashboard() {
  return (
    <ProtectedRoute allowedRoles={["candidate"]}>
      <CandidateDashboardContent />
    </ProtectedRoute>
  )
}

function CandidateDashboardContent() {
  const router = useRouter()
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [activeView, setActiveView] = useState<DashboardView>("home")
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isInterviewStarted, setIsInterviewStarted] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isMicEnabled, setIsMicEnabled] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [interviewHistory, setInterviewHistory] = useState<InterviewHistory[]>([])
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [loadingData, setLoadingData] = useState(false)
  const [mySchedule, setMySchedule] = useState<Schedule[]>([])

  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true)
      try {
        const [history, stats, schedule] = await Promise.all([
          api.getInterviewHistory(),
          api.getUserStats(),
          api.getMySchedule().catch(() => [])
        ])

        // Fix: Map null performanceRating to undefined to match UI types
        const mappedHistory = history.map(h => ({
          ...h,
          performanceRating: h.performanceRating === null ? undefined : h.performanceRating
        }));

        setInterviewHistory(mappedHistory as any)
        setUserStats(stats)
        setMySchedule(schedule)
      } catch (error) {
        console.log("[v0] Using demo data, API not available")
      } finally {
        setLoadingData(false)
      }
    }
    fetchData()
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const toggleMic = () => {
    setIsMicEnabled(!isMicEnabled)
  }

  const handleFileSelect = useCallback(async (file: File) => {
    const validTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]
    if (!validTypes.includes(file.type)) {
      setUploadError("Please upload a PDF, DOC, or DOCX file")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File size must be less than 10MB")
      return
    }

    setUploadedFile(file)
    setUploadError(null)
    setIsUploading(true)

    try {
      const response = await api.uploadResume(file)
      setSessionId(response.session_id)
      console.log("[v0] Resume uploaded, session:", response.session_id)

      // Bridge: Sync with extension
      if (typeof window !== "undefined") {
        window.postMessage({ type: "SET_SESSION_ID", sessionId: response.session_id }, "*")
      }
    } catch (error) {
      console.error("Upload failed:", error)
      setSessionId("demo_session_" + Date.now())
    } finally {
      setIsUploading(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file) handleFileSelect(file)
    },
    [handleFileSelect],
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const startInterview = async (id?: string) => {
    const sid = id || sessionId
    if (sid) {
      try {
        await api.startInterview(sid)
        console.log("[v0] Interview started")
      } catch (error) {
        console.error("Failed to start interview:", error)
      }
      setIsInterviewStarted(true)
    }
  }

  const handleNavigation = (view: DashboardView) => {
    if (isInterviewStarted) {
      if (!window.confirm("You are in an active interview. Are you sure you want to leave? Your progress will be lost.")) {
        return
      }
      setIsInterviewStarted(false)
    }
    setActiveView(view)
  }

  const handleDownloadCalendar = async (id: string, candidateName: string) => {
    try {
      const blob = await api.getCalendar(id)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `interview.ics`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      alert("Failed to download calendar file")
    }
  }

  const sidebarItems = [
    { id: "home" as const, label: "Home", icon: HomeIcon },
    { id: "schedule" as const, label: "My Schedule", icon: ClockIcon }, // NEW
    { id: "practice" as const, label: "Practice Mode", icon: PlayIcon },
    { id: "upload" as const, label: "Upload Resume", icon: UploadIcon },
    { id: "inbox" as const, label: "Inbox", icon: InboxIcon },
    { id: "reports" as const, label: "Reports", icon: BarChartIcon },
    { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboardIcon },
    { id: "history" as const, label: "History", icon: HistoryIcon },
  ]

  const bgMain = theme === "dark" ? "bg-[#0d1117]" : "bg-gray-100"
  const bgSidebar = theme === "dark" ? "bg-[#161b22]" : "bg-white"
  const bgCard = theme === "dark" ? "bg-[#161b22]" : "bg-white"
  const borderColor = theme === "dark" ? "border-gray-800" : "border-gray-200"
  const textPrimary = theme === "dark" ? "text-white" : "text-gray-900"
  const textSecondary = theme === "dark" ? "text-gray-400" : "text-gray-600"

  const renderContent = () => {
    switch (activeView) {
      case "practice":
        return <PracticeInterview onBack={() => setActiveView("home")} />
      case "inbox":
        return (
          <div className={`${bgCard} rounded-xl border ${borderColor} p-8`}>
            <h2 className={`text-2xl font-bold ${textPrimary} mb-4`}>Inbox</h2>
            <p className={textSecondary}>Your messages and notifications will appear here.</p>
            <div className="mt-6 space-y-4">
              <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-gray-800" : "bg-gray-50"}`}>
                <p className={textSecondary}>No new messages</p>
              </div>
            </div>
          </div>
        )
      case "reports":
        return (
          <div className={`${bgCard} rounded-xl border ${borderColor} p-8`}>
            <h2 className={`text-2xl font-bold ${textPrimary} mb-4`}>Reports</h2>
            <p className={textSecondary}>View your interview reports and performance analytics.</p>
            {loadingData ? (
              <div className="flex items-center justify-center py-8">
                <Loader2Icon className="w-6 h-6 animate-spin text-cyan-400" />
              </div>
            ) : interviewHistory.filter((h) => h.status === "completed").length > 0 ? (
              <div className="mt-6 space-y-4">
                {interviewHistory
                  .filter((h) => h.status === "completed")
                  .map((interview) => (
                    <div
                      key={interview.sessionId}
                      className={`p-4 rounded-lg ${theme === "dark" ? "bg-gray-800" : "bg-gray-50"} cursor-pointer hover:bg-gray-700 transition-colors`}
                      onClick={() => router.push(`/report?sessionId=${interview.sessionId}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={textPrimary}>{interview.resumeFileName || "Interview Report"}</p>
                          <p className={`text-sm ${textSecondary}`}>
                            {new Date(interview.startedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-cyan-400 font-bold">{interview.averageScore?.toFixed(1) || "--"}/10</p>
                          <p className={`text-xs ${textSecondary}`}>{interview.performanceRating}</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="mt-6">
                <p className={`${textSecondary} text-center py-8`}>No completed interviews yet</p>
                <Button
                  onClick={() => setActiveView("home")}
                  className="w-full mt-4 bg-cyan-500 hover:bg-cyan-600 text-black"
                >
                  Start Your First Interview
                </Button>
              </div>
            )}
          </div>
        )
      case "dashboard":
        return (
          <div className={`${bgCard} rounded-xl border ${borderColor} p-8`}>
            <h2 className={`text-2xl font-bold ${textPrimary} mb-4`}>Dashboard Overview</h2>
            {loadingData ? (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-32 w-full rounded-lg" />
                  ))}
                </div>
                <div>
                  <Skeleton className="h-8 w-48 mb-3" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-24 rounded-full" />
                    <Skeleton className="h-8 w-32 rounded-full" />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-cyan-500/10" : "bg-cyan-50"}`}>
                    <div className="flex items-center gap-3">
                      <AwardIcon className="w-8 h-8 text-cyan-400" />
                      <div>
                        <p className={textSecondary}>Interviews Completed</p>
                        <p className={`text-3xl font-bold ${textPrimary}`}>{userStats?.completedInterviews || 0}</p>
                      </div>
                    </div>
                  </div>
                  <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-green-500/10" : "bg-green-50"}`}>
                    <div className="flex items-center gap-3">
                      <TrendingUpIcon className="w-8 h-8 text-green-400" />
                      <div>
                        <p className={textSecondary}>Average Score</p>
                        <p className={`text-3xl font-bold ${textPrimary}`}>
                          {userStats?.averageScore ? userStats.averageScore.toFixed(1) : "--"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-amber-500/10" : "bg-amber-50"}`}>
                    <div className="flex items-center gap-3">
                      <SparklesIcon className="w-8 h-8 text-amber-400" />
                      <div>
                        <p className={textSecondary}>Skills Detected</p>
                        <p className={`text-3xl font-bold ${textPrimary}`}>{userStats?.skillsImproved || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top Skills */}
                {userStats?.topSkills && userStats.topSkills.length > 0 && (
                  <div className="mt-6">
                    <h3 className={`text-lg font-semibold ${textPrimary} mb-3`}>Your Top Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {userStats.topSkills.map((skill) => (
                        <span key={skill} className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-sm">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Performance */}
                {userStats?.recentScores && userStats.recentScores.length > 0 && (
                  <div className="mt-6">
                    <h3 className={`text-lg font-semibold ${textPrimary} mb-3`}>Recent Performance</h3>
                    <div className="space-y-2">
                      {userStats.recentScores.map((score, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <span className={`text-sm ${textSecondary} w-24`}>{score.date}</span>
                          <div className="flex-1 h-2 bg-gray-700 rounded-full">
                            <div
                              className="h-full bg-gradient-to-r from-cyan-500 to-green-500 rounded-full"
                              style={{ width: `${score.score * 10}%` }}
                            />
                          </div>
                          <span className="text-cyan-400 font-medium w-12">{score.score.toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )
      case "history":
        return (
          <div className={`${bgCard} rounded-xl border ${borderColor} p-8`}>
            <h2 className={`text-2xl font-bold ${textPrimary} mb-4`}>Interview History</h2>
            <p className={textSecondary}>Your past interview sessions.</p>
            {loadingData ? (
              <div className="flex items-center justify-center py-8">
                <Loader2Icon className="w-6 h-6 animate-spin text-cyan-400" />
              </div>
            ) : interviewHistory.length > 0 ? (
              <div className="mt-6 space-y-4">
                {interviewHistory.map((interview) => (
                  <div
                    key={interview.sessionId}
                    className={`p-4 rounded-lg ${theme === "dark" ? "bg-gray-800" : "bg-gray-50"} hover:bg-gray-700 transition-colors cursor-pointer`}
                    onClick={() => interview.status === "completed" && router.push(`/report?sessionId=${interview.sessionId}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${interview.status === "completed"
                            ? "bg-green-500/20"
                            : interview.status === "in-progress"
                              ? "bg-yellow-500/20"
                              : "bg-gray-500/20"
                            }`}
                        >
                          {interview.status === "completed" ? (
                            <AwardIcon className="w-5 h-5 text-green-400" />
                          ) : (
                            <ClockIcon className="w-5 h-5 text-yellow-400" />
                          )}
                        </div>
                        <div>
                          <p className={textPrimary}>{interview.resumeFileName || "Interview Session"}</p>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm ${textSecondary}`}>
                              {new Date(interview.startedAt).toLocaleDateString()}
                            </span>
                            <span
                              className={cn(
                                "text-xs px-2 py-0.5 rounded",
                                interview.status === "completed"
                                  ? "bg-green-500/20 text-green-400"
                                  : interview.status === "in-progress"
                                    ? "bg-yellow-500/20 text-yellow-400"
                                    : "bg-gray-500/20 text-gray-400",
                              )}
                            >
                              {interview.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {interview.averageScore !== null ? (
                          <>
                            <p className="text-cyan-400 font-bold text-lg">{interview.averageScore.toFixed(1)}/10</p>
                            <p className={`text-xs ${textSecondary}`}>
                              {interview.questionsAnswered}/{interview.totalQuestions} questions
                            </p>
                          </>
                        ) : (
                          <p className={textSecondary}>--</p>
                        )}
                      </div>
                    </div>
                    {interview.strongestSkills && interview.strongestSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {interview.strongestSkills.slice(0, 3).map((skill) => (
                          <span key={skill} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6">
                <p className={`${textSecondary} text-center py-8`}>No interview history yet</p>
                <Button
                  onClick={() => setActiveView("home")}
                  className="w-full mt-4 bg-cyan-500 hover:bg-cyan-600 text-black"
                >
                  Start Your First Interview
                </Button>
              </div>
            )}
          </div>
        )
      case "settings" as any:
        return (
          <div className={`${bgCard} rounded-xl border ${borderColor} p-8`}>
            <h2 className={`text-2xl font-bold ${textPrimary} mb-4`}>Candidate Settings</h2>
            <div className="space-y-6 max-w-2xl">
              <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                <div>
                  <div className={textPrimary}>Dark Mode</div>
                  <div className={`text-sm ${textSecondary}`}>Toggle application theme</div>
                </div>
                <Button
                  variant="outline"
                  onClick={toggleTheme}
                  className={theme === "dark" ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50" : ""}
                >
                  {theme === "dark" ? "On" : "Off"}
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                <div>
                  <div className={textPrimary}>Voice Response</div>
                  <div className={`text-sm ${textSecondary}`}>Enable voice input by default</div>
                </div>
                <Button
                  variant="outline"
                  onClick={toggleMic}
                  className={isMicEnabled ? "bg-green-500/20 text-green-400 border-green-500/50" : ""}
                >
                  {isMicEnabled ? "Enabled" : "Disabled"}
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg opacity-50 cursor-not-allowed">
                <div>
                  <div className={textPrimary}>Email Notifications</div>
                  <div className={`text-sm ${textSecondary}`}>Receive interview results via email</div>
                </div>
                <Button variant="outline" disabled>Coming Soon</Button>
              </div>
            </div>
          </div>
        )
      case "schedule":
        return (
          <div className={`${bgCard} rounded-xl border ${borderColor} p-8`}>
            <h2 className={`text-2xl font-bold ${textPrimary} mb-4`}>My Schedule</h2>
            <p className={textSecondary}>Your upcoming interviews.</p>
            {loadingData ? (
              <div className="flex items-center justify-center py-8">
                <Loader2Icon className="w-6 h-6 animate-spin text-cyan-400" />
              </div>
            ) : mySchedule.length > 0 ? (
              <div className="mt-6 space-y-4">
                {mySchedule.map((item) => (
                  <div key={item.id} className={`p-4 rounded-lg ${theme === "dark" ? "bg-gray-800" : "bg-gray-50"} border ${borderColor}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className={`text-lg font-semibold ${textPrimary}`}>{item.type.charAt(0).toUpperCase() + item.type.slice(1)} Interview</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="w-4 h-4" />
                            {new Date(item.date).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <ClockIcon className="w-4 h-4" />
                            {item.time} ({item.duration} min)
                          </span>
                        </div>
                        {item.notes && <p className="mt-2 text-sm text-gray-500 italic">{item.notes}</p>}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleDownloadCalendar(item.id, "Interview")}>
                          Add to Calendar
                        </Button>
                        {/* Logic to show "Join" button if close to time */}
                        {/* For simplicity, we enable it if status is 'sent' or 'confirmed' */}
                        {(item.status === 'sent' || item.status === 'confirmed') && (
                          <Button size="sm" className="bg-green-500 text-black hover:bg-green-600" onClick={() => {
                            setSessionId(item.id)
                            startInterview(item.id)
                          }}>
                            Join Interview
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 text-center py-8">
                <p className={textSecondary}>No upcoming interviews scheduled.</p>
              </div>
            )}
          </div>
        )
      case "upload":
        return renderUploadSection()
      case "home":
      default:
        return renderHomeSection()
    }
  }

  const renderHomeSection = () => (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Hero Section */}
      <div className={`${bgCard} rounded-xl border ${borderColor} p-10 text-center relative overflow-hidden`}>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-green-500" />
        <div className="w-20 h-20 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <SparklesIcon className="w-10 h-10 text-cyan-400" />
        </div>
        <h1 className={`text-4xl font-bold ${textPrimary} mb-4`}>Master Your Interview Skills</h1>
        <p className={`text-lg ${textSecondary} max-w-2xl mx-auto mb-8`}>
          Experience the future of interview preparation. Our AI-powered platform analyzes your resume,
          conducts realistic interviews, and provides detailed actionable feedback to help you land your dream job.
        </p>
        <div className="flex justify-center gap-4">
          <Button
            size="lg"
            onClick={() => setActiveView("upload")}
            className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold px-8 py-6 text-lg shadow-lg shadow-cyan-500/20 transition-all hover:scale-105"
          >
            Start Your Interview Journey
          </Button>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`${bgCard} rounded-xl border ${borderColor} p-6 hover:border-cyan-500/50 transition-colors`}>
          <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
            <FileTextIcon className="w-6 h-6 text-blue-400" />
          </div>
          <h3 className={`text-xl font-semibold ${textPrimary} mb-2`}>Resume Analysis</h3>
          <p className={textSecondary}>
            Our AI scans your resume to generate tailored questions that match your unique experience and skills.
          </p>
        </div>
        <div className={`${bgCard} rounded-xl border ${borderColor} p-6 hover:border-cyan-500/50 transition-colors`}>
          <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-4">
            <MicIcon className="w-6 h-6 text-green-400" />
          </div>
          <h3 className={`text-xl font-semibold ${textPrimary} mb-2`}>Voice Interaction</h3>
          <p className={textSecondary}>
            Practice speaking confidently with our voice-enabled AI interviewer that listens and responds in real-time.
          </p>
        </div>
        <div className={`${bgCard} rounded-xl border ${borderColor} p-6 hover:border-cyan-500/50 transition-colors`}>
          <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4">
            <BarChartIcon className="w-6 h-6 text-purple-400" />
          </div>
          <h3 className={`text-xl font-semibold ${textPrimary} mb-2`}>Detailed Analytics</h3>
          <p className={textSecondary}>
            Get comprehensive reports on your answers, soft skills, and technical knowledge after every session.
          </p>
        </div>
      </div>

      {/* How it Works / Demo Guide */}
      <div className={`${bgCard} rounded-xl border ${borderColor} p-8`}>
        <h2 className={`text-2xl font-bold ${textPrimary} mb-8 text-center`}>How It Works</h2>
        <div className="relative">
          {/* Connecting Line */}
          <div className="absolute top-12 left-0 w-full h-0.5 bg-gray-700 hidden md:block" />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
            {/* Step 1 */}
            <div className="text-center">
              <div className={`w-24 h-24 ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} border-2 rounded-full flex items-center justify-center mx-auto mb-4 relative`}>
                <span className="text-3xl font-bold text-gray-500">1</span>
                <div className="absolute -bottom-2 -right-2 bg-blue-500 rounded-full p-2">
                  <UploadIcon className="w-4 h-4 text-white" />
                </div>
              </div>
              <h4 className={`font-semibold ${textPrimary} mb-1`}>Upload Resume</h4>
              <p className={`text-sm ${textSecondary}`}>Upload your PDF/Doc resume to contextualize the AI.</p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className={`w-24 h-24 ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} border-2 rounded-full flex items-center justify-center mx-auto mb-4 relative`}>
                <span className="text-3xl font-bold text-gray-500">2</span>
                <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-2">
                  <SettingsIcon className="w-4 h-4 text-white" />
                </div>
              </div>
              <h4 className={`font-semibold ${textPrimary} mb-1`}>Configure</h4>
              <p className={`text-sm ${textSecondary}`}>Enable your microphone and camera for a realistic experience.</p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className={`w-24 h-24 ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} border-2 rounded-full flex items-center justify-center mx-auto mb-4 relative`}>
                <span className="text-3xl font-bold text-gray-500">3</span>
                <div className="absolute -bottom-2 -right-2 bg-red-500 rounded-full p-2">
                  <PlayIcon className="w-4 h-4 text-white" />
                </div>
              </div>
              <h4 className={`font-semibold ${textPrimary} mb-1`}>Interview</h4>
              <p className={`text-sm ${textSecondary}`}>Answer questions verbally or via text in a live session.</p>
            </div>

            {/* Step 4 */}
            <div className="text-center">
              <div className={`w-24 h-24 ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} border-2 rounded-full flex items-center justify-center mx-auto mb-4 relative`}>
                <span className="text-3xl font-bold text-gray-500">4</span>
                <div className="absolute -bottom-2 -right-2 bg-purple-500 rounded-full p-2">
                  <AwardIcon className="w-4 h-4 text-white" />
                </div>
              </div>
              <h4 className={`font-semibold ${textPrimary} mb-1`}>Feedback</h4>
              <p className={`text-sm ${textSecondary}`}>Receive an instant detailed report on your performance.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderUploadSection = () => (
    <>
      {isInterviewStarted && sessionId ? (
        <InterviewChat 
          sessionId={sessionId} 
          onEndInterview={() => {
            setIsInterviewStarted(false)
            setActiveView("reports")
            // refresh data
            api.getInterviewHistory().then(h => setInterviewHistory(h as any)).catch(console.error)
          }} 
        />
      ) : (
        <div className="max-w-2xl mx-auto">
          <div className={`${bgCard} rounded-xl border ${borderColor} p-8`}>
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mb-4">
                <UploadIcon className="w-8 h-8 text-cyan-400" />
              </div>
              <h2 className={`text-2xl font-bold ${textPrimary} mb-2`}>Upload Your Resume</h2>
              <p className={textSecondary}>Upload your resume to get started with personalized interview preparation</p>
            </div>

            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className={`border-2 border-dashed ${theme === "dark" ? "border-gray-700 hover:border-cyan-400" : "border-gray-300 hover:border-cyan-500"} rounded-lg p-8 text-center mb-4 transition-colors cursor-pointer`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />
              <FileTextIcon
                className={`w-12 h-12 ${theme === "dark" ? "text-gray-600" : "text-gray-400"} mx-auto mb-4`}
              />
              <p className={`${textPrimary} font-medium mb-1`}>Drop your file here or browse</p>
              <p className={`${textSecondary} text-sm`}>PDF, DOC, DOCX up to 10MB</p>
            </div>

            {uploadError && <p className="text-red-400 text-sm text-center mb-4">{uploadError}</p>}

            {uploadedFile && (
              <div
                className={`flex items-center gap-3 p-3 ${theme === "dark" ? "bg-gray-800" : "bg-gray-100"} rounded-lg mb-4`}
              >
                <FileTextIcon className="w-5 h-5 text-cyan-400" />
                <span className={`flex-1 truncate ${textPrimary}`}>{uploadedFile.name}</span>
                {isUploading && <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-cyan-400" />}
              </div>
            )}

            <Button
              onClick={() => (sessionId ? startInterview() : fileInputRef.current?.click())}
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-semibold py-3"
              disabled={isUploading}
            >
              <UploadIcon className="w-5 h-5 mr-2" />
              {sessionId ? "Start Interview" : "Browse Files"}
            </Button>
          </div>

          <div className="mt-8 text-center">
            <h3 className={`text-xl font-bold ${textPrimary} mb-2`}>{"I'm here to help you crack your dream job"}</h3>
            <p className={textSecondary}>
              Ask me anything about interview preparation, career advice, or job search strategies
            </p>
            <p className={`${textSecondary} text-sm mt-4`}>
              AI can make mistakes. Please verify important information.
            </p>
          </div>
        </div>
      )}
    </>
  )

  return (
    <div className={`flex h-screen ${bgMain} ${textPrimary}`}>
      {/* Mobile Sidebar Toggle */}
      {!isInterviewStarted && (
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg ${bgSidebar} ${borderColor} border`}
        >
          {isSidebarOpen ? <XIcon className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
        </button>
      )}

      {/* Sidebar */}
      {!isInterviewStarted && (
        <aside
          className={cn(
            `w-64 ${bgSidebar} border-r ${borderColor} flex flex-col fixed md:relative h-full z-40 transition-transform duration-300`,
            isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          )}
        >
        <div className={`p-4 border-b ${borderColor}`}>
          <UserProfileDropdown />
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left",
                activeView === item.id
                  ? "bg-cyan-500/20 text-cyan-400"
                  : `${textSecondary} hover:${theme === "dark" ? "bg-gray-800" : "bg-gray-100"} hover:${textPrimary}`,
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Upgrade Banner */}
        <div className={`p-4 border-t ${borderColor}`}>
          <button className="flex items-center gap-2 text-amber-400 text-sm">
            <SparklesIcon className="w-4 h-4" />
            <div className="text-left">
              <div>Upgrade today to premium</div>
              <div className={`${textSecondary} text-xs`}>features & more</div>
            </div>
          </button>
        </div>
      </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col md:ml-0">
        {/* Header */}
        <header className={`h-16 ${bgSidebar} border-b ${borderColor} flex items-center justify-between px-6`}>
          <div className="flex items-center gap-3 ml-12 md:ml-0">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <div>
              <h1 className="font-semibold">Xcelisor Interview Bot</h1>
              <p className={`text-sm ${textSecondary}`}>AI-powered interview assistant</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleMic}
              className={`p-2 rounded-lg transition-colors ${isMicEnabled ? "bg-cyan-500/20 text-cyan-400" : `${textSecondary} hover:${textPrimary}`}`}
              title={isMicEnabled ? "Disable Mic" : "Enable Mic"}
            >
              {isMicEnabled ? <MicIcon className="w-5 h-5" /> : <MicOffIcon className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setActiveView("settings" as any)} // Use view switching instead of modal for consistency
              className={`p-2 ${textSecondary} hover:${textPrimary} transition-colors rounded-lg`}
              title="Settings"
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
            <button
              onClick={toggleTheme}
              className={`p-2 ${textSecondary} hover:${textPrimary} transition-colors rounded-lg`}
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === "dark" ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            </button>
            <button
              onClick={toggleFullscreen}
              className={`p-2 ${textSecondary} hover:${textPrimary} transition-colors rounded-lg`}
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? <Minimize2Icon className="w-5 h-5" /> : <MaximizeIcon className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">{renderContent()}</div>
        </main>
      {isSidebarOpen && !isInterviewStarted && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setIsSidebarOpen(false)} />
      )}
    </div>
  )
}
