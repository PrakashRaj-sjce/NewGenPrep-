"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    TrendingUpIcon,
    AlertCircleIcon,
    UsersIcon,
    CheckCircle2Icon,
    ClockIcon,
    BarChartIcon
} from "@/components/icons"
import { cn } from "@/lib/utils"
import type { AnalyticsData, Candidate } from "@/types"

interface EnhancedAnalyticsProps {
    analytics: AnalyticsData | null
    candidates: Candidate[]
}

type TimeRange = "7d" | "30d" | "90d" | "all"

export function EnhancedAnalytics({ analytics, candidates }: EnhancedAnalyticsProps) {
    const [timeRange, setTimeRange] = useState<TimeRange>("30d")

    // Mock trend data (in production, this would come from the API)
    const trendData = useMemo(() => {
        const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : timeRange === "90d" ? 90 : 180
        return Array.from({ length: Math.min(days, 12) }, (_, i) => ({
            date: new Date(Date.now() - (days - i - 1) * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            interviews: Math.floor(Math.random() * 10) + 2,
            avgScore: Math.floor(Math.random() * 3) + 6,
        }))
    }, [timeRange])

    // Funnel data
    const funnelData = useMemo(() => {
        const total = candidates.length || 100
        const completed = candidates.filter(c => c.status === "completed").length || Math.floor(total * 0.6)
        const passed = candidates.filter(c => c.score && c.score >= 7).length || Math.floor(completed * 0.5)
        const hired = Math.floor(passed * 0.4)

        return [
            { stage: "Applied", count: total, percentage: 100, color: "bg-blue-500" },
            { stage: "Interview Completed", count: completed, percentage: Math.round((completed / total) * 100), color: "bg-cyan-500" },
            { stage: "Passed (7+)", count: passed, percentage: Math.round((passed / total) * 100), color: "bg-green-500" },
            { stage: "Hired", count: hired, percentage: Math.round((hired / total) * 100), color: "bg-purple-500" },
        ]
    }, [candidates])

    // Proctoring statistics
    const proctoringStats = useMemo(() => ({
        totalViolations: Math.floor(Math.random() * 50) + 10,
        tabSwitches: Math.floor(Math.random() * 30) + 5,
        fullscreenExits: Math.floor(Math.random() * 20) + 3,
        devToolsAttempts: Math.floor(Math.random() * 10),
        noFaceDetected: Math.floor(Math.random() * 15) + 2,
        multipleFaces: Math.floor(Math.random() * 5),
        terminatedSessions: Math.floor(Math.random() * 5),
    }), [])

    // Score distribution
    const scoreDistribution = useMemo(() => {
        const excellent = candidates.filter(c => c.score && c.score >= 8).length
        const good = candidates.filter(c => c.score && c.score >= 6 && c.score < 8).length
        const average = candidates.filter(c => c.score && c.score >= 4 && c.score < 6).length
        const poor = candidates.filter(c => c.score && c.score < 4).length
        const total = excellent + good + average + poor || 1

        return [
            { label: "Excellent (8-10)", count: excellent, percentage: Math.round((excellent / total) * 100), color: "bg-green-500" },
            { label: "Good (6-8)", count: good, percentage: Math.round((good / total) * 100), color: "bg-cyan-500" },
            { label: "Average (4-6)", count: average, percentage: Math.round((average / total) * 100), color: "bg-yellow-500" },
            { label: "Needs Work (<4)", count: poor, percentage: Math.round((poor / total) * 100), color: "bg-red-500" },
        ]
    }, [candidates])

    const maxInterviews = Math.max(...trendData.map(d => d.interviews), 1)

    return (
        <div className="space-y-6">
            {/* Header with Time Range */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Enhanced Analytics</h2>
                    <p className="text-gray-400 text-sm">Comprehensive interview insights and trends</p>
                </div>
                <div className="flex gap-2">
                    {(["7d", "30d", "90d", "all"] as TimeRange[]).map((range) => (
                        <Button
                            key={range}
                            variant={timeRange === range ? "default" : "outline"}
                            size="sm"
                            onClick={() => setTimeRange(range)}
                            className={cn(
                                timeRange === range
                                    ? "bg-green-500 text-black"
                                    : "border-gray-700 text-gray-400"
                            )}
                        >
                            {range === "all" ? "All Time" : range}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Key Metrics Row */}
            <div className="grid grid-cols-4 gap-4">
                <Card className="bg-[#161b22] border-gray-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                <UsersIcon className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{candidates.length}</p>
                                <p className="text-xs text-gray-400">Total Candidates</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-[#161b22] border-gray-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                                <CheckCircle2Icon className="w-5 h-5 text-green-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">
                                    {candidates.filter(c => c.status === "completed").length}
                                </p>
                                <p className="text-xs text-gray-400">Completed</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-[#161b22] border-gray-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                                <TrendingUpIcon className="w-5 h-5 text-cyan-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">
                                    {analytics?.overview.averageScore?.toFixed(1) || "0"}
                                </p>
                                <p className="text-xs text-gray-400">Avg Score</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-[#161b22] border-gray-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                                <BarChartIcon className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">
                                    {funnelData[2].percentage}%
                                </p>
                                <p className="text-xs text-gray-400">Pass Rate</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-2 gap-6">
                {/* Trend Chart */}
                <Card className="bg-[#161b22] border-gray-800">
                    <CardHeader>
                        <CardTitle className="text-white text-lg">Interview Trends</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-48 flex items-end gap-2">
                            {trendData.map((day, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                    <div
                                        className="w-full bg-green-500/80 rounded-t transition-all hover:bg-green-400"
                                        style={{ height: `${(day.interviews / maxInterviews) * 100}%` }}
                                        title={`${day.interviews} interviews`}
                                    />
                                    <span className="text-[10px] text-gray-500 rotate-45 origin-left translate-y-2">
                                        {day.date}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between mt-8 text-xs text-gray-500">
                            <span>Interviews over time</span>
                            <span className="text-green-400">
                                Total: {trendData.reduce((sum, d) => sum + d.interviews, 0)}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Score Distribution */}
                <Card className="bg-[#161b22] border-gray-800">
                    <CardHeader>
                        <CardTitle className="text-white text-lg">Score Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {scoreDistribution.map((item) => (
                                <div key={item.label}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-400">{item.label}</span>
                                        <span className="text-white">{item.count} ({item.percentage}%)</span>
                                    </div>
                                    <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                                        <div
                                            className={cn(item.color, "h-full rounded-full transition-all")}
                                            style={{ width: `${item.percentage}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-2 gap-6">
                {/* Hiring Funnel */}
                <Card className="bg-[#161b22] border-gray-800">
                    <CardHeader>
                        <CardTitle className="text-white text-lg">Hiring Funnel</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {funnelData.map((stage, i) => (
                                <div key={stage.stage} className="relative">
                                    <div
                                        className={cn(
                                            stage.color,
                                            "h-12 rounded-lg flex items-center justify-between px-4 transition-all"
                                        )}
                                        style={{
                                            width: `${Math.max(stage.percentage, 20)}%`,
                                            opacity: 0.8 + (i * 0.05)
                                        }}
                                    >
                                        <span className="text-white font-medium text-sm">{stage.stage}</span>
                                        <span className="text-white/80 text-sm">{stage.count}</span>
                                    </div>
                                    <span className="absolute right-0 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                                        {stage.percentage}%
                                    </span>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-4">
                            Conversion from Applied to Hired: {funnelData[3].percentage}%
                        </p>
                    </CardContent>
                </Card>

                {/* Proctoring Statistics */}
                <Card className="bg-[#161b22] border-gray-800">
                    <CardHeader>
                        <CardTitle className="text-white text-lg flex items-center gap-2">
                            <AlertCircleIcon className="w-5 h-5 text-yellow-400" />
                            Proctoring Statistics
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-gray-800/50 rounded-lg">
                                <p className="text-2xl font-bold text-red-400">{proctoringStats.totalViolations}</p>
                                <p className="text-xs text-gray-400">Total Violations</p>
                            </div>
                            <div className="p-3 bg-gray-800/50 rounded-lg">
                                <p className="text-2xl font-bold text-yellow-400">{proctoringStats.tabSwitches}</p>
                                <p className="text-xs text-gray-400">Tab Switches</p>
                            </div>
                            <div className="p-3 bg-gray-800/50 rounded-lg">
                                <p className="text-2xl font-bold text-orange-400">{proctoringStats.fullscreenExits}</p>
                                <p className="text-xs text-gray-400">Fullscreen Exits</p>
                            </div>
                            <div className="p-3 bg-gray-800/50 rounded-lg">
                                <p className="text-2xl font-bold text-purple-400">{proctoringStats.devToolsAttempts}</p>
                                <p className="text-xs text-gray-400">DevTools Attempts</p>
                            </div>
                            <div className="p-3 bg-gray-800/50 rounded-lg">
                                <p className="text-2xl font-bold text-cyan-400">{proctoringStats.noFaceDetected}</p>
                                <p className="text-xs text-gray-400">No Face Detected</p>
                            </div>
                            <div className="p-3 bg-gray-800/50 rounded-lg">
                                <p className="text-2xl font-bold text-pink-400">{proctoringStats.terminatedSessions}</p>
                                <p className="text-xs text-gray-400">Terminated</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Skills Analysis */}
            {analytics?.skillAnalysis && analytics.skillAnalysis.length > 0 && (
                <Card className="bg-[#161b22] border-gray-800">
                    <CardHeader>
                        <CardTitle className="text-white text-lg">Top Skills Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-5 gap-4">
                            {analytics.skillAnalysis.slice(0, 10).map((skill) => (
                                <div key={skill.skill} className="text-center p-3 bg-gray-800/50 rounded-lg">
                                    <p className="text-lg font-bold text-cyan-400">{skill.avgScore.toFixed(1)}</p>
                                    <p className="text-sm text-white truncate">{skill.skill}</p>
                                    <p className="text-xs text-gray-500">{skill.mentions} mentions</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
