"use client"

import { useState, useEffect } from "react"
import {
    CalendarIcon,
    ClockIcon,
    PlusIcon,
    XIcon,
    MailIcon,
    CheckCircle2Icon
} from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { api, Schedule } from "@/lib/api"

interface InterviewSchedulerProps {
    onSchedule?: (interview: Omit<Schedule, "id" | "status">) => void
}

export function InterviewScheduler({ onSchedule }: InterviewSchedulerProps) {
    const [scheduledInterviews, setScheduledInterviews] = useState<Schedule[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchSchedules()
    }, [])

    const fetchSchedules = async () => {
        try {
            const data = await api.getSchedules()
            setScheduledInterviews(data)
        } catch (error) {
            console.error("Failed to fetch schedules:", error)
        } finally {
            setLoading(false)
        }
    }

    const [showForm, setShowForm] = useState(false)
    const [formData, setFormData] = useState({
        candidateEmail: "",
        candidateName: "",
        date: "",
        time: "",
        // deadline: "", // Not in new API schema yet, storing in notes or separate field if needed. 
        // Wait, Schema in api.ts defined type, duration. I should match Schema.
        type: "technical",
        duration: 60,
        notes: ""
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            await api.createSchedule({
                ...formData,
                type: formData.type,
                duration: formData.duration
            })

            fetchSchedules() // Refresh list
            onSchedule?.(formData)

            // Reset form
            setFormData({
                candidateEmail: "",
                candidateName: "",
                date: "",
                time: "",
                type: "technical",
                duration: 60,
                notes: ""
            })
            setShowForm(false)
        } catch (error) {
            alert("Failed to create schedule")
        }
    }

    const sendInvitation = async (id: string) => {
        try {
            await api.updateScheduleStatus(id, "sent")
            fetchSchedules()
            alert(`Invitation email sent!`)
        } catch (error) {
            alert("Failed to update status")
        }
    }

    const cancelInterview = async (id: string) => {
        // We implemented update status, so let's set it to cancelled
        try {
            await api.updateScheduleStatus(id, "cancelled")
            fetchSchedules()
        } catch (error) {
            alert("Failed to cancel interview")
        }
    }

    const handleDownloadCalendar = async (id: string, candidateName: string) => {
        try {
            const blob = await api.getCalendar(id)
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `interview_${candidateName.replace(/\s+/g, '_')}.ics`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
        } catch (error) {
            alert("Failed to download calendar file")
        }
    }

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            scheduled: "bg-gray-500/20 text-gray-400",
            sent: "bg-blue-500/20 text-blue-400",
            confirmed: "bg-green-500/20 text-green-400",
            completed: "bg-cyan-500/20 text-cyan-400",
            expired: "bg-red-500/20 text-red-400",
            cancelled: "bg-red-500/20 text-red-400"
        }
        return styles[status] || styles["scheduled"]
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Interview Scheduling</h2>
                    <p className="text-gray-400 text-sm">Schedule and manage candidate interviews</p>
                </div>
                <Button
                    onClick={() => setShowForm(true)}
                    className="bg-green-500 hover:bg-green-600 text-black"
                >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Schedule Interview
                </Button>
            </div>

            {/* Schedule Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <Card className="bg-[#161b22] border-gray-800 w-full max-w-lg">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-white">Schedule New Interview</CardTitle>
                            <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                                <XIcon className="w-5 h-5" />
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm text-gray-400 mb-1 block">Candidate Name</label>
                                        <Input
                                            required
                                            value={formData.candidateName}
                                            onChange={(e) => setFormData(prev => ({ ...prev, candidateName: e.target.value }))}
                                            placeholder="John Doe"
                                            className="bg-gray-800 border-gray-700 text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-400 mb-1 block">Email</label>
                                        <Input
                                            required
                                            type="email"
                                            value={formData.candidateEmail}
                                            onChange={(e) => setFormData(prev => ({ ...prev, candidateEmail: e.target.value }))}
                                            placeholder="john@example.com"
                                            className="bg-gray-800 border-gray-700 text-white"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm text-gray-400 mb-1 block">Interview Date</label>
                                        <Input
                                            required
                                            type="date"
                                            value={formData.date}
                                            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                            className="bg-gray-800 border-gray-700 text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-400 mb-1 block">Time</label>
                                        <Input
                                            required
                                            type="time"
                                            value={formData.time}
                                            onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                                            className="bg-gray-800 border-gray-700 text-white"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm text-gray-400 mb-1 block">Type</label>
                                        <select
                                            className="w-full bg-gray-800 border-gray-700 text-white rounded-md h-10 px-3 text-sm"
                                            value={formData.type}
                                            onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                                        >
                                            <option value="technical">Technical</option>
                                            <option value="behavioral">Behavioral</option>
                                            <option value="final">Final Round</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-400 mb-1 block">Duration (min)</label>
                                        <Input
                                            required
                                            type="number"
                                            value={formData.duration}
                                            onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                                            className="bg-gray-800 border-gray-700 text-white"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm text-gray-400 mb-1 block">Notes (Optional)</label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                        placeholder="Any special instructions..."
                                        className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white text-sm resize-none h-20"
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">
                                        Cancel
                                    </Button>
                                    <Button type="submit" className="flex-1 bg-green-500 hover:bg-green-600 text-black">
                                        Schedule & Send Invite
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Scheduled Interviews List */}
            <Card className="bg-[#161b22] border-gray-800">
                <CardHeader>
                    <CardTitle className="text-white">Scheduled Interviews</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="text-gray-400 text-center py-8">Loading...</p>
                    ) : scheduledInterviews.length === 0 ? (
                        <p className="text-gray-400 text-center py-8">No interviews scheduled yet.</p>
                    ) : (
                        <div className="space-y-4">
                            {scheduledInterviews.map((interview: any) => (
                                <div
                                    key={interview.id}
                                    className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center text-lg font-medium">
                                            {interview.candidateName[0]}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <div className="font-medium text-white">{interview.candidateName}</div>
                                                {interview.reminded_24h && (
                                                    <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full border border-purple-500/30">
                                                        24h Reminded
                                                    </span>
                                                )}
                                                {interview.reminded_1h && (
                                                    <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full border border-red-500/30 animate-pulse">
                                                        1h Alert
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm text-gray-400">{interview.candidateEmail}</div>
                                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <CalendarIcon className="w-3 h-3" />
                                                    {new Date(interview.date).toLocaleDateString()}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <ClockIcon className="w-3 h-3" />
                                                    {interview.time}
                                                </span>
                                                <span className="capitalize px-2 py-0.5 bg-gray-700 rounded">
                                                    {interview.type} ({interview.duration}m)
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <span className={cn(
                                            "px-2.5 py-1 rounded-full text-xs font-medium capitalize",
                                            getStatusBadge(interview.status)
                                        )}>
                                            {interview.status}
                                        </span>

                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleDownloadCalendar(interview.id, interview.candidateName)}
                                                className="border-gray-700 text-gray-300 hover:text-white"
                                                title="Add to Calendar"
                                            >
                                                <CalendarIcon className="w-4 h-4" />
                                            </Button>
                                            {interview.status === "scheduled" && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => sendInvitation(interview.id)}
                                                    className="bg-blue-500 hover:bg-blue-600 text-white"
                                                >
                                                    <MailIcon className="w-4 h-4 mr-1" />
                                                    Send Invite
                                                </Button>
                                            )}
                                            {interview.status !== "completed" && interview.status !== "cancelled" && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => cancelInterview(interview.id)}
                                                    className="text-red-400 hover:text-red-300"
                                                >
                                                    Cancel
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-4">
                <Card className="bg-[#161b22] border-gray-800">
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-white">{scheduledInterviews.length}</div>
                        <div className="text-xs text-gray-400">Total Scheduled</div>
                    </CardContent>
                </Card>
                <Card className="bg-[#161b22] border-gray-800">
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-blue-400">
                            {scheduledInterviews.filter(i => i.status === "sent").length}
                        </div>
                        <div className="text-xs text-gray-400">Invites Sent</div>
                    </CardContent>
                </Card>
                <Card className="bg-[#161b22] border-gray-800">
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-green-400">
                            {scheduledInterviews.filter(i => i.status === "confirmed").length}
                        </div>
                        <div className="text-xs text-gray-400">Confirmed</div>
                    </CardContent>
                </Card>
                <Card className="bg-[#161b22] border-gray-800">
                    <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-cyan-400">
                            {scheduledInterviews.filter(i => i.status === "completed").length}
                        </div>
                        <div className="text-xs text-gray-400">Completed</div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
