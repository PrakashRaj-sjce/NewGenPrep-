"use client"

import { useState, useEffect } from "react"
import {
  UsersIcon,
  FileTextIcon,
  BarChartIcon,
  SettingsIcon,
  UploadIcon,
  SearchIcon,
  TrendingUpIcon,
  TargetIcon,
  ClockIcon,
  PlusIcon,
  XIcon,
  Loader2Icon,
  CalendarIcon,
} from "@/components/icons"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { ProtectedRoute } from "@/components/protected-route"
import { api } from "@/lib/api"
import type { Candidate, AnalyticsData, QuestionSet } from "@/lib/api"
import { cn } from "@/lib/utils"
import { CandidateManagement } from "@/components/candidate-management"
import { InterviewScheduler } from "@/components/interview-scheduler"
import { QuestionSetsView } from "@/components/question-sets-view"
import { ScoringRubrics } from "@/components/scoring-rubrics"
import { EnhancedAnalytics } from "@/components/enhanced-analytics"

type HRView = "dashboard" | "candidates" | "questions" | "reports" | "analytics" | "settings" | "scheduling" | "rubrics"

export default function HRDashboard() {
  return (
    <ProtectedRoute allowedRoles={["hr"]}>
      <HRDashboardContent />
    </ProtectedRoute>
  )
}

function HRDashboardContent() {
  const { user, logout } = useAuth()
  const [activeView, setActiveView] = useState<HRView>("dashboard")
  const [searchQuery, setSearchQuery] = useState("")
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  // New State for Settings
  const [hrSettings, setHrSettings] = useState({
    max_questions: 15,
    adaptive_difficulty: true,
    voice_input: true
  })

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [candidatesData, analyticsData, settingsData] = await Promise.all([
          api.getCandidates().catch(() => []),
          api.getAnalytics().catch(() => null),
          api.getHRSettings().catch(() => null),
        ])
        setCandidates(candidatesData)
        setAnalytics(analyticsData)
        if (settingsData) setHrSettings(settingsData)
      } catch (error) {
        console.error("Failed to fetch data:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const sidebarItems = [
    { id: "dashboard" as const, label: "Dashboard", icon: BarChartIcon },
    { id: "candidates" as const, label: "Candidates", icon: UsersIcon },
    { id: "scheduling" as const, label: "Scheduling", icon: CalendarIcon },
    { id: "rubrics" as const, label: "Rubrics", icon: TargetIcon },
    { id: "questions" as const, label: "Question Sets", icon: FileTextIcon },
    { id: "reports" as const, label: "Reports", icon: FileTextIcon },
    { id: "analytics" as const, label: "Analytics", icon: TrendingUpIcon },
    { id: "settings" as const, label: "Settings", icon: SettingsIcon },
  ]

  const filteredCandidates = candidates.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const stats = analytics?.overview || {
    totalCandidates: candidates.length,
    completed: candidates.filter((c) => c.status === "completed").length,
    inProgress: candidates.filter((c) => c.status === "in-progress").length,
    averageScore: Math.round(
      candidates.filter((c) => c.score !== null).reduce((sum, c) => sum + (c.score || 0), 0) /
      (candidates.filter((c) => c.score !== null).length || 1),
    ),
  }

  return (
    <div className="flex h-screen bg-[#0d1117] text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-[#161b22] border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center">
              <TargetIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-semibold">HR Portal</h1>
              <p className="text-sm text-gray-400">Admin Dashboard</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-2">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left",
                activeView === item.id
                  ? "bg-green-500/20 text-green-400"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white",
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-black font-bold">
              {user?.name?.[0]?.toUpperCase() || "H"}
            </div>
            <div>
              <div className="font-medium">{user?.name || "HR Admin"}</div>
              <div className="text-sm text-gray-400">{user?.email}</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full text-left text-gray-400 hover:text-white transition-colors text-sm"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="h-16 bg-[#161b22] border-b border-gray-800 flex items-center justify-between px-6">
          <h1 className="text-xl font-semibold">
            {sidebarItems.find((i) => i.id === activeView)?.label || "Dashboard"}
          </h1>
          <div className="flex items-center gap-4">
            <div className="relative">
              <SearchIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidates..."
                className="pl-10 bg-gray-800 border-gray-700 text-white w-64"
              />
            </div>
          </div>
        </header>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2Icon className="w-8 h-8 animate-spin text-green-400" />
            </div>
          ) : (
            <>
              {activeView === "dashboard" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-[#161b22] border-gray-800">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400">Total Candidates</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-white">{stats.totalCandidates}</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-[#161b22] border-gray-800">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400">Completed</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-green-400">{stats.completed}</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-[#161b22] border-gray-800">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400">In Progress</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-yellow-400">{stats.inProgress}</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-[#161b22] border-gray-800">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400">Avg Score</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-cyan-400">{stats.averageScore || 0}%</div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="bg-[#161b22] border-gray-800">
                    <CardHeader>
                      <CardTitle className="text-white">Recent Candidates</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {filteredCandidates.length === 0 ? (
                        <p className="text-gray-400 text-center py-8">
                          No candidates yet. They will appear here after completing interviews.
                        </p>
                      ) : (
                        <div className="space-y-4">
                          {filteredCandidates.slice(0, 5).map((candidate) => (
                            <div
                              key={candidate.id}
                              className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                                  {candidate.name[0]}
                                </div>
                                <div>
                                  <div className="font-medium text-white">{candidate.name}</div>
                                  <div className="text-sm text-gray-400">{candidate.email}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <span
                                  className={cn(
                                    "px-3 py-1 rounded-full text-xs font-medium",
                                    candidate.status === "completed"
                                      ? "bg-green-500/20 text-green-400"
                                      : candidate.status === "in-progress"
                                        ? "bg-yellow-500/20 text-yellow-400"
                                        : "bg-gray-500/20 text-gray-400",
                                  )}
                                >
                                  {candidate.status}
                                </span>
                                {candidate.score !== null && (
                                  <span className="text-cyan-400 font-medium">{candidate.score.toFixed(1)}/10</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeView === "candidates" && (
                <CandidateManagement
                  candidates={candidates}
                  onViewReport={(sessionId) => window.open(`/report?sessionId=${sessionId}`, "_blank")}
                />
              )}

              {activeView === "scheduling" && (
                <InterviewScheduler />
              )}

              {activeView === "rubrics" && (
                <ScoringRubrics />
              )}

              {activeView === "questions" && (
                <QuestionSetsView />
              )}

              {activeView === "analytics" && (
                <EnhancedAnalytics analytics={analytics} candidates={candidates} />
              )}

              {activeView === "reports" && (
                <Card className="bg-[#161b22] border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white">Interview Reports</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-400 mb-4">
                      Click on any candidate to view their detailed interview report.
                    </p>
                    {filteredCandidates.filter((c) => c.status === "completed").length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No completed interviews yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {filteredCandidates
                          .filter((c) => c.status === "completed")
                          .map((candidate) => (
                            <div
                              key={candidate.id}
                              className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
                              onClick={() =>
                                candidate.sessionId && window.open(`/report?sessionId=${candidate.sessionId}`, "_blank")
                              }
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                                  {candidate.name[0]}
                                </div>
                                <div>
                                  <p className="font-medium text-white">{candidate.name}</p>
                                  <p className="text-sm text-gray-400">{candidate.date}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-cyan-400 font-bold">{candidate.score?.toFixed(1)}/10</span>
                                <Button variant="ghost" size="sm" className="text-green-400">
                                  View Report
                                </Button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {activeView === "settings" && (
                <Card className="bg-[#161b22] border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white">Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-white mb-4">Interview Configuration</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                          <div>
                            <div className="text-white">Max Questions per Interview</div>
                            <div className="text-sm text-gray-400">
                              Default: 15 questions (5 resume + 5 general + 5 HR)
                            </div>
                          </div>
                          <Input
                            type="number"
                            min={5}
                            max={30}
                            value={hrSettings.max_questions}
                            onChange={(e) => setHrSettings({ ...hrSettings, max_questions: parseInt(e.target.value) || 15 })}
                            className="w-20 bg-gray-800 border-gray-700"
                          />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                          <div>
                            <div className="text-white">Adaptive Difficulty</div>
                            <div className="text-sm text-gray-400">Adjust question difficulty based on responses</div>
                          </div>
                          <Switch
                            checked={hrSettings.adaptive_difficulty}
                            onCheckedChange={(checked) => setHrSettings({ ...hrSettings, adaptive_difficulty: checked })}
                          />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                          <div>
                            <div className="text-white">Voice Input</div>
                            <div className="text-sm text-gray-400">Allow candidates to use voice for responses</div>
                          </div>
                          <Switch
                            checked={hrSettings.voice_input}
                            onCheckedChange={(checked) => setHrSettings({ ...hrSettings, voice_input: checked })}
                          />
                        </div>
                      </div>

                      <div className="mt-6 flex justify-end">
                        <Button
                          className="bg-green-500 hover:bg-green-600 text-black"
                          onClick={async () => {
                            try {
                              await api.saveHRSettings(hrSettings)
                              alert("Settings saved successfully!")
                            } catch (e) {
                              alert("Failed to save settings")
                            }
                          }}
                        >
                          Save Configuration
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
