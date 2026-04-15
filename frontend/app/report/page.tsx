"use client"

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ProtectedRoute } from "@/components/protected-route"
import type { InterviewReport } from "@/lib/api"
import {
    ArrowLeftIcon,
    DownloadIcon,
    Share2Icon,
    TrendingUpIcon,
    TargetIcon,
    AwardIcon,
    CheckCircle2Icon,
    FileTextIcon,
    MessageSquareIcon,
    UserIcon,
} from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api"
import { useTheme } from "@/lib/theme-context"
import { cn } from "@/lib/utils"

function ReportParamsWrapper() {
    const searchParams = useSearchParams()
    const sessionId = searchParams.get("sessionId")

    if (!sessionId) {
        return (
            <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-400">No session ID provided.</p>
                    <Link href="/dashboard/candidate">
                        <Button className="mt-4 bg-cyan-500 hover:bg-cyan-600 text-black">Go to Dashboard</Button>
                    </Link>
                </div>
            </div>
        )
    }

    return <ReportContent sessionId={sessionId} />
}

export default function ReportPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400 mx-auto mb-4" />
                    <p className="text-gray-400">Loading...</p>
                </div>
            </div>
        }>
            <ProtectedRoute>
                <ReportParamsWrapper />
            </ProtectedRoute>
        </Suspense>
    )
}

function ReportContent({ sessionId }: { sessionId: string }) {
    const router = useRouter()
    const [report, setReport] = useState<InterviewReport | null>(null)
    const [loading, setLoading] = useState(true)
    const { theme } = useTheme()

    const bgMain = theme === "dark" ? "bg-[#0d1117]" : "bg-gray-50"
    const bgHeader = theme === "dark" ? "bg-[#161b22]" : "bg-white"
    const cardBg = theme === "dark" ? "bg-[#161b22]" : "bg-white"
    const borderColor = theme === "dark" ? "border-gray-800" : "border-gray-200"
    const textPrimary = theme === "dark" ? "text-white" : "text-gray-900"

    useEffect(() => {
        const fetchReport = async () => {
            try {
                const data = await api.getReport(sessionId)
                setReport(data)
                console.log("[v0] Report loaded:", sessionId)
            } catch (error) {
                console.error("Failed to fetch report:", error)
            } finally {
                setLoading(false)
            }
        }

        if (sessionId) {
            fetchReport()
        }
    }, [sessionId])

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400 mx-auto mb-4" />
                    <p className="text-gray-400">Loading your report...</p>
                </div>
            </div>
        )
    }

    if (!report) {
        return (
            <div className="min-h-screen bg-[#0d1117] flex items-center justify-center text-white">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Report Not Found</h1>
                    <p className="text-gray-400 mb-4">This interview session may not exist or is still in progress.</p>
                    <Link href="/dashboard/candidate">
                        <Button className="bg-cyan-500 hover:bg-cyan-600 text-black">Go to Dashboard</Button>
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className={`min-h-screen ${bgMain} ${textPrimary}`}>
            {/* Header */}
            <header className={`${bgHeader} border-b ${borderColor} px-6 py-4`}>
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard/candidate">
                            <Button variant="ghost" size="icon" className="hover:text-white">
                                <ArrowLeftIcon className="w-5 h-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-semibold">Interview Report</h1>
                            <p className="text-sm text-gray-400">
                                {report.interview_summary.candidate_name || `Session: ${sessionId.slice(0, 8)}...`}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" className={`${borderColor} bg-transparent hover:bg-gray-800`}>
                            <Share2Icon className="w-4 h-4 mr-2" />
                            Share
                        </Button>
                        <Button className="bg-cyan-500 hover:bg-cyan-600 text-black">
                            <DownloadIcon className="w-4 h-4 mr-2" />
                            Download PDF
                        </Button>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-6xl mx-auto p-6 space-y-6">
                {(report.interview_summary.candidate_name || report.interview_summary.candidate_email) && (
                    <Card className={`${cardBg} ${borderColor}`}>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center">
                                    <UserIcon className="w-6 h-6 text-cyan-400" />
                                </div>
                                <div>
                                    <p className="font-semibold text-white">{report.interview_summary.candidate_name}</p>
                                    <p className="text-sm text-gray-400">{report.interview_summary.candidate_email}</p>
                                </div>
                                <div className="ml-auto text-right">
                                    <p className="text-sm text-gray-400">Duration</p>
                                    <p className="text-white font-medium">
                                        {report.interview_summary.duration_minutes
                                            ? `${report.interview_summary.duration_minutes} minutes`
                                            : "N/A"}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Performance Rating Banner */}
                <Card className={`bg-gradient-to-r from-cyan-900/40 to-purple-900/30 ${borderColor} overflow-hidden`}>
                    <CardContent className="p-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm mb-2">Overall Performance</p>
                                <h2 className="text-4xl font-bold mb-2">
                                    {typeof report.performance_rating === "object"
                                        ? report.performance_rating.rating
                                        : report.performance_rating}
                                </h2>
                                <p className="text-gray-400 max-w-md">
                                    {typeof report.performance_rating === "object"
                                        ? report.performance_rating.description
                                        : "Your interview has been evaluated based on response quality, technical depth, and communication skills."}
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-cyan-500 to-green-500 flex items-center justify-center">
                                    <div className="w-28 h-28 rounded-full bg-[#0d1117] flex items-center justify-center">
                                        <span className="text-4xl font-bold">
                                            {report.interview_summary.average_quality_score.toFixed(1)}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-gray-400 text-sm mt-2">out of 10</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className={`${cardBg} ${borderColor}`}>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center">
                                    <TargetIcon className="w-6 h-6 text-cyan-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-400">Average Score</p>
                                    <p className="text-2xl font-bold text-white">
                                        {report.interview_summary.average_quality_score.toFixed(1)}/10
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className={`${cardBg} ${borderColor}`}>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                                    <TrendingUpIcon className="w-6 h-6 text-green-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-400">Coverage</p>
                                    <p className="text-2xl font-bold text-white">{Number(report.interview_summary.coverage_percentage).toFixed(1)}%</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className={`${cardBg} ${borderColor}`}>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                                    <MessageSquareIcon className="w-6 h-6 text-yellow-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-400">Questions</p>
                                    <p className="text-2xl font-bold text-white">{report.interview_summary.total_questions}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className={`${cardBg} ${borderColor}`}>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                                    <AwardIcon className="w-6 h-6 text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-400">Difficulty</p>
                                    <p className="text-2xl font-bold text-white capitalize">
                                        {report.interview_summary.difficulty_level}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Question Breakdown */}
                {report.question_breakdown && (
                    <Card className={`${cardBg} ${borderColor}`}>
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <FileTextIcon className="w-5 h-5 text-cyan-400" />
                                Question Breakdown (15 Total: 5 Resume + 5 General + 5 HR)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                    <p className="text-3xl font-bold text-blue-400">{report.question_breakdown.resume_questions}</p>
                                    <p className="text-sm text-gray-400 mt-1">Resume Questions</p>
                                    <p className="text-xs text-gray-500">Based on your skills & projects</p>
                                </div>
                                <div className="text-center p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                                    <p className="text-3xl font-bold text-purple-400">{report.question_breakdown.general_questions}</p>
                                    <p className="text-sm text-gray-400 mt-1">General Questions</p>
                                    <p className="text-xs text-gray-500">Behavioral & technical skills</p>
                                </div>
                                <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                                    <p className="text-3xl font-bold text-green-400">{report.question_breakdown.hr_questions}</p>
                                    <p className="text-sm text-gray-400 mt-1">HR Questions</p>
                                    <p className="text-xs text-gray-500">From HR uploaded question bank</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Skills Assessment */}
                <Card className={`${cardBg} ${borderColor}`}>
                    <CardHeader>
                        <CardTitle className="text-white">Skills Assessment</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h4 className="text-sm font-medium text-gray-400 uppercase">Detected Skills</h4>
                                {Object.entries(report.skills_assessment.detected_skills || {})
                                    .sort((a, b) => (b[1] as number) - (a[1] as number))
                                    .slice(0, 6)
                                    .map(([skill, score]) => (
                                        <div key={skill} className="space-y-1">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-300 capitalize">{skill.replace("_", " ")}</span>
                                                <span className="text-white">{typeof score === "number" ? score : 0} mentions</span>
                                            </div>
                                            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-cyan-500 to-green-500 rounded-full transition-all"
                                                    style={{ width: `${Math.min(100, (score as number) * 20)}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                            </div>

                            <div>
                                <h4 className="text-sm font-medium text-gray-400 uppercase mb-4">Top Skills</h4>
                                <div className="space-y-2">
                                    {(report.skills_assessment.strongest_skills || []).slice(0, 5).map((skill, index) => (
                                        <div key={skill} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
                                            <span
                                                className={cn(
                                                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                                                    index === 0
                                                        ? "bg-yellow-500/20 text-yellow-400"
                                                        : index === 1
                                                            ? "bg-gray-400/20 text-gray-300"
                                                            : "bg-orange-500/20 text-orange-400",
                                                )}
                                            >
                                                {index + 1}
                                            </span>
                                            <span className="text-white capitalize">{skill}</span>
                                            {index === 0 && (
                                                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">Top Skill</span>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6 p-4 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                                    <p className="text-sm text-gray-400">Technical Level</p>
                                    <p className="text-lg font-semibold text-cyan-400 capitalize">
                                        {report.skills_assessment.primary_technical_level}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Resume Analysis Summary */}
                {report.resume_analysis && Object.keys(report.resume_analysis).length > 0 && (
                    <Card className={`${cardBg} ${borderColor}`}>
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <FileTextIcon className="w-5 h-5 text-cyan-400" />
                                Resume Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {report.resume_analysis.projects && report.resume_analysis.projects.length > 0 && (
                                    <div className="p-4 bg-gray-800/30 rounded-lg">
                                        <p className="text-sm text-gray-400 mb-2">Projects Mentioned</p>
                                        <div className="space-y-1">
                                            {report.resume_analysis.projects.slice(0, 3).map((project, i) => (
                                                <p key={i} className="text-white text-sm">
                                                    {project}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {report.resume_analysis.experience_level && (
                                    <div className="p-4 bg-gray-800/30 rounded-lg">
                                        <p className="text-sm text-gray-400 mb-2">Experience Level</p>
                                        <p className="text-white capitalize">{report.resume_analysis.experience_level}</p>
                                    </div>
                                )}
                                {report.resume_analysis.completeness_score !== undefined && (
                                    <div className="p-4 bg-gray-800/30 rounded-lg">
                                        <p className="text-sm text-gray-400 mb-2">Resume Completeness</p>
                                        <p className="text-white">{report.resume_analysis.completeness_score}%</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Recommendations */}
                <Card className={`${cardBg} ${borderColor}`}>
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <CheckCircle2Icon className="w-5 h-5 text-green-400" />
                            Recommendations for Improvement
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3">
                            {(report.recommendations || []).map((rec, index) => (
                                <li key={index} className="flex items-start gap-3 p-4 bg-gray-800/30 rounded-lg">
                                    <span className="w-6 h-6 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 text-sm flex-shrink-0 mt-0.5">
                                        {index + 1}
                                    </span>
                                    <span className="text-gray-300">{rec}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>

                {/* Conversation Log */}
                {report.conversation_log && report.conversation_log.length > 0 && (
                    <Card className={`${cardBg} ${borderColor}`}>
                        <CardHeader>
                            <CardTitle className="text-white">Interview Transcript</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4 max-h-[500px] overflow-auto pr-2">
                                {report.conversation_log.map((item, index) => (
                                    <div key={index} className="border-b border-gray-800 pb-4 last:border-0">
                                        {/* Question */}
                                        <div className="mb-3">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                                                    Q{item.question.number}
                                                </span>
                                                <span className="text-xs text-gray-500 capitalize">{item.question.type} question</span>
                                                {item.question.source && (
                                                    <span className="text-xs text-gray-600">({item.question.source})</span>
                                                )}
                                            </div>
                                            <p className="text-gray-300">{item.question.text}</p>
                                        </div>

                                        {/* Response */}
                                        {item.response && (
                                            <div className="ml-4 pl-4 border-l-2 border-cyan-500/30">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs text-gray-500">Your Response</span>
                                                    <span
                                                        className={cn(
                                                            "text-xs px-2 py-0.5 rounded",
                                                            item.response.quality_score >= 7
                                                                ? "bg-green-500/20 text-green-400"
                                                                : item.response.quality_score >= 4
                                                                    ? "bg-yellow-500/20 text-yellow-400"
                                                                    : "bg-red-500/20 text-red-400",
                                                        )}
                                                    >
                                                        Score: {item.response.quality_score.toFixed(1)}
                                                    </span>
                                                </div>
                                                <p className="text-gray-400">{item.response.text}</p>
                                                {item.response.feedback && (
                                                    <p className="text-sm text-cyan-400 mt-1 italic">{item.response.feedback}</p>
                                                )}
                                                {item.response.detected_skills && item.response.detected_skills.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {item.response.detected_skills.map((skill) => (
                                                            <span key={skill} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                                                                {skill}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Action Buttons */}
                <div className="flex justify-center gap-4 pt-4">
                    <Link href="/dashboard/candidate">
                        <Button
                            variant="outline"
                            className={`${borderColor} bg-transparent hover:bg-gray-800`}
                        >
                            Back to Dashboard
                        </Button>
                    </Link>
                    <Button
                        className="bg-cyan-500 hover:bg-cyan-600 text-black"
                        onClick={() => router.push("/dashboard/candidate")}
                    >
                        Start New Interview
                    </Button>
                </div>
            </main>
        </div>
    )
}
