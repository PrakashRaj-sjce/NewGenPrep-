"use client"

import { useState, useMemo } from "react"
import {
    SearchIcon,
    FilterIcon,
    CheckCircle2Icon,
    XIcon,
    BarChartIcon,
    ClockIcon,
    TrashIcon,
    MailIcon,
    UploadIcon
} from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Candidate } from "@/types"

interface CandidateManagementProps {
    candidates: Candidate[]
    onViewReport: (sessionId: string) => void
}

type FilterStatus = "all" | "completed" | "in-progress" | "pending"
type SortField = "name" | "score" | "date" | "status"
type SortOrder = "asc" | "desc"

export function CandidateManagement({ candidates, onViewReport }: CandidateManagementProps) {
    // Selection state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [showComparison, setShowComparison] = useState(false)

    // Filter state
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState<FilterStatus>("all")
    const [scoreMin, setScoreMin] = useState<number | null>(null)
    const [scoreMax, setScoreMax] = useState<number | null>(null)
    const [showFilters, setShowFilters] = useState(false)

    // Sort state
    const [sortField, setSortField] = useState<SortField>("date")
    const [sortOrder, setSortOrder] = useState<SortOrder>("desc")

    // Filtered and sorted candidates
    const filteredCandidates = useMemo(() => {
        return candidates
            .filter((c) => {
                // Search filter
                if (searchQuery) {
                    const q = searchQuery.toLowerCase()
                    if (!c.name.toLowerCase().includes(q) && !c.email.toLowerCase().includes(q)) {
                        return false
                    }
                }
                // Status filter
                if (statusFilter !== "all" && c.status !== statusFilter) {
                    return false
                }
                // Score filter
                if (scoreMin !== null && (c.score === null || c.score < scoreMin)) {
                    return false
                }
                if (scoreMax !== null && (c.score === null || c.score > scoreMax)) {
                    return false
                }
                return true
            })
            .sort((a, b) => {
                let comparison = 0
                switch (sortField) {
                    case "name":
                        comparison = a.name.localeCompare(b.name)
                        break
                    case "score":
                        comparison = (a.score || 0) - (b.score || 0)
                        break
                    case "date":
                        comparison = new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime()
                        break
                    case "status":
                        comparison = (a.status || "").localeCompare(b.status || "")
                        break
                }
                return sortOrder === "asc" ? comparison : -comparison
            })
    }, [candidates, searchQuery, statusFilter, scoreMin, scoreMax, sortField, sortOrder])

    // Select all
    const toggleSelectAll = () => {
        if (selectedIds.size === filteredCandidates.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(filteredCandidates.map((c) => c.id)))
        }
    }

    // Toggle single selection
    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds)
        if (newSet.has(id)) {
            newSet.delete(id)
        } else {
            newSet.add(id)
        }
        setSelectedIds(newSet)
    }

    // Get selected candidates for comparison
    const selectedCandidates = candidates.filter((c) => selectedIds.has(c.id))

    // Bulk actions
    const handleBulkExport = () => {
        const data = selectedCandidates.map((c) => ({
            Name: c.name,
            Email: c.email,
            Status: c.status,
            Score: c.score?.toFixed(1) || "N/A",
            Date: c.date || "N/A"
        }))

        // Create CSV
        const headers = Object.keys(data[0] || {}).join(",")
        const rows = data.map((row) => Object.values(row).join(","))
        const csv = [headers, ...rows].join("\n")

        // Download
        const blob = new Blob([csv], { type: "text/csv" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `candidates_export_${new Date().toISOString().split("T")[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    // Status counts for filter badges
    const statusCounts = useMemo(() => ({
        all: candidates.length,
        completed: candidates.filter((c) => c.status === "completed").length,
        "in-progress": candidates.filter((c) => c.status === "in-progress").length,
        pending: candidates.filter((c) => c.status === "pending").length,
    }), [candidates])

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    {/* Search */}
                    <div className="relative">
                        <SearchIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name or email..."
                            className="pl-10 bg-gray-800 border-gray-700 text-white w-72"
                        />
                    </div>

                    {/* Filter toggle */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowFilters(!showFilters)}
                        className={cn(
                            "border-gray-700",
                            showFilters && "bg-green-500/20 border-green-500 text-green-400"
                        )}
                    >
                        <FilterIcon className="w-4 h-4 mr-2" />
                        Filters
                        {(statusFilter !== "all" || scoreMin !== null || scoreMax !== null) && (
                            <span className="ml-2 bg-green-500 text-black text-xs px-1.5 py-0.5 rounded-full">
                                Active
                            </span>
                        )}
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    {/* Comparison button */}
                    {selectedIds.size >= 2 && selectedIds.size <= 4 && (
                        <Button
                            size="sm"
                            onClick={() => setShowComparison(true)}
                            className="bg-cyan-500 hover:bg-cyan-600 text-black"
                        >
                            <BarChartIcon className="w-4 h-4 mr-2" />
                            Compare ({selectedIds.size})
                        </Button>
                    )}

                    {/* Bulk export */}
                    {selectedIds.size > 0 && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleBulkExport}
                            className="border-gray-700"
                        >
                            <UploadIcon className="w-4 h-4 mr-2" />
                            Export ({selectedIds.size})
                        </Button>
                    )}
                </div>
            </div>

            {/* Advanced Filters Panel */}
            {showFilters && (
                <Card className="bg-[#161b22] border-gray-800">
                    <CardContent className="p-4">
                        <div className="flex flex-wrap gap-6">
                            {/* Status filter */}
                            <div>
                                <label className="text-sm text-gray-400 mb-2 block">Status</label>
                                <div className="flex gap-2">
                                    {(["all", "completed", "in-progress", "pending"] as FilterStatus[]).map((status) => (
                                        <Button
                                            key={status}
                                            size="sm"
                                            variant={statusFilter === status ? "default" : "outline"}
                                            onClick={() => setStatusFilter(status)}
                                            className={cn(
                                                "text-xs",
                                                statusFilter === status
                                                    ? "bg-green-500 text-black"
                                                    : "border-gray-700 text-gray-400"
                                            )}
                                        >
                                            {status === "all" ? "All" : status}
                                            <span className="ml-1 text-xs opacity-70">({statusCounts[status]})</span>
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            {/* Score range */}
                            <div>
                                <label className="text-sm text-gray-400 mb-2 block">Score Range</label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        min={0}
                                        max={10}
                                        step={0.5}
                                        placeholder="Min"
                                        value={scoreMin ?? ""}
                                        onChange={(e) => setScoreMin(e.target.value ? parseFloat(e.target.value) : null)}
                                        className="w-20 bg-gray-800 border-gray-700 text-white"
                                    />
                                    <span className="text-gray-500">to</span>
                                    <Input
                                        type="number"
                                        min={0}
                                        max={10}
                                        step={0.5}
                                        placeholder="Max"
                                        value={scoreMax ?? ""}
                                        onChange={(e) => setScoreMax(e.target.value ? parseFloat(e.target.value) : null)}
                                        className="w-20 bg-gray-800 border-gray-700 text-white"
                                    />
                                </div>
                            </div>

                            {/* Sort */}
                            <div>
                                <label className="text-sm text-gray-400 mb-2 block">Sort By</label>
                                <div className="flex gap-2">
                                    <select
                                        value={sortField}
                                        onChange={(e) => setSortField(e.target.value as SortField)}
                                        className="bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-sm"
                                    >
                                        <option value="date">Date</option>
                                        <option value="name">Name</option>
                                        <option value="score">Score</option>
                                        <option value="status">Status</option>
                                    </select>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                                        className="border-gray-700 text-gray-400"
                                    >
                                        {sortOrder === "asc" ? "↑" : "↓"}
                                    </Button>
                                </div>
                            </div>

                            {/* Clear filters */}
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                    setStatusFilter("all")
                                    setScoreMin(null)
                                    setScoreMax(null)
                                    setSearchQuery("")
                                }}
                                className="text-gray-400 self-end"
                            >
                                Clear All
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Candidates Table */}
            <Card className="bg-[#161b22] border-gray-800">
                <CardContent className="p-0">
                    {/* Table Header */}
                    <div className="flex items-center gap-4 p-4 bg-gray-800/50 border-b border-gray-700">
                        <input
                            type="checkbox"
                            checked={selectedIds.size === filteredCandidates.length && filteredCandidates.length > 0}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-green-500 focus:ring-green-500"
                        />
                        <div className="flex-1 grid grid-cols-12 gap-4 text-sm text-gray-400 font-medium">
                            <div className="col-span-4">Candidate</div>
                            <div className="col-span-2">Status</div>
                            <div className="col-span-2">Score</div>
                            <div className="col-span-2">Date</div>
                            <div className="col-span-2 text-right">Actions</div>
                        </div>
                    </div>

                    {/* Candidates List */}
                    {filteredCandidates.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            No candidates match your filters
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-800">
                            {filteredCandidates.map((candidate) => (
                                <div
                                    key={candidate.id}
                                    className={cn(
                                        "flex items-center gap-4 p-4 hover:bg-gray-800/50 transition-colors",
                                        selectedIds.has(candidate.id) && "bg-green-500/10"
                                    )}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(candidate.id)}
                                        onChange={() => toggleSelect(candidate.id)}
                                        className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-green-500 focus:ring-green-500"
                                    />
                                    <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                                        {/* Candidate info */}
                                        <div className="col-span-4 flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center text-lg font-medium">
                                                {candidate.name[0]}
                                            </div>
                                            <div>
                                                <div className="font-medium text-white">{candidate.name}</div>
                                                <div className="text-sm text-gray-400">{candidate.email}</div>
                                            </div>
                                        </div>

                                        {/* Status */}
                                        <div className="col-span-2">
                                            <span
                                                className={cn(
                                                    "px-2.5 py-1 rounded-full text-xs font-medium",
                                                    candidate.status === "completed"
                                                        ? "bg-green-500/20 text-green-400"
                                                        : candidate.status === "in-progress"
                                                            ? "bg-yellow-500/20 text-yellow-400"
                                                            : "bg-gray-500/20 text-gray-400"
                                                )}
                                            >
                                                {candidate.status}
                                            </span>
                                        </div>

                                        {/* Score */}
                                        <div className="col-span-2">
                                            {candidate.score !== null ? (
                                                <div className="flex items-center gap-2">
                                                    <span className={cn(
                                                        "text-lg font-bold",
                                                        candidate.score >= 7 ? "text-green-400" :
                                                            candidate.score >= 5 ? "text-yellow-400" :
                                                                "text-red-400"
                                                    )}>
                                                        {candidate.score.toFixed(1)}
                                                    </span>
                                                    <span className="text-xs text-gray-500">/10</span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-500">—</span>
                                            )}
                                        </div>

                                        {/* Date */}
                                        <div className="col-span-2 text-sm text-gray-400">
                                            {candidate.date ? (
                                                <span className="flex items-center gap-1">
                                                    <ClockIcon className="w-3 h-3" />
                                                    {new Date(candidate.date).toLocaleDateString()}
                                                </span>
                                            ) : (
                                                "—"
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="col-span-2 flex justify-end gap-2">
                                            {candidate.sessionId && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => onViewReport(candidate.sessionId!)}
                                                    className="text-gray-400 hover:text-white"
                                                >
                                                    View Report
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

            {/* Comparison Modal */}
            {showComparison && selectedCandidates.length >= 2 && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-8">
                    <Card className="bg-[#161b22] border-gray-800 w-full max-w-5xl max-h-[80vh] overflow-auto">
                        <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-[#161b22] z-10 border-b border-gray-800">
                            <CardTitle className="text-white">Candidate Comparison</CardTitle>
                            <Button variant="ghost" size="icon" onClick={() => setShowComparison(false)}>
                                <XIcon className="w-5 h-5" />
                            </Button>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedCandidates.length}, 1fr)` }}>
                                {selectedCandidates.map((candidate) => (
                                    <div key={candidate.id} className="bg-gray-800/50 rounded-xl p-6 text-center">
                                        <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                                            {candidate.name[0]}
                                        </div>
                                        <h3 className="text-lg font-semibold text-white">{candidate.name}</h3>
                                        <div className="text-sm text-gray-400 mb-1">{candidate.email}</div>
                                        {candidate.phone && <div className="text-xs text-gray-500 mb-2">{candidate.phone}</div>}
                                        
                                        {candidate.professional_summary && (
                                            <div className="bg-gray-900/50 rounded p-3 mb-4 text-left border border-gray-800">
                                                <p className="text-xs text-gray-300 italic leading-snug line-clamp-3">
                                                    &ldquo;{candidate.professional_summary}&rdquo;
                                                </p>
                                            </div>
                                        )}

                                        <div className="space-y-4 text-left">
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Status</span>
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded text-xs",
                                                    candidate.status === "completed" ? "bg-green-500/20 text-green-400" :
                                                        candidate.status === "in-progress" ? "bg-yellow-500/20 text-yellow-400" :
                                                            "bg-gray-500/20 text-gray-400"
                                                )}>
                                                    {candidate.status}
                                                </span>
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-400">Score</span>
                                                <span className={cn(
                                                    "text-2xl font-bold",
                                                    candidate.score !== null && candidate.score >= 7 ? "text-green-400" :
                                                        candidate.score !== null && candidate.score >= 5 ? "text-yellow-400" :
                                                            candidate.score !== null ? "text-red-400" : "text-gray-500"
                                                )}>
                                                    {candidate.score?.toFixed(1) || "—"}
                                                </span>
                                            </div>

                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Interviews</span>
                                                <span className="text-white">{candidate.totalInterviews}</span>
                                            </div>

                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Date</span>
                                                <span className="text-white text-sm">
                                                    {candidate.date ? new Date(candidate.date).toLocaleDateString() : "—"}
                                                </span>
                                            </div>
                                        </div>

                                        {candidate.sessionId && (
                                            <Button
                                                className="w-full mt-6 bg-green-500 hover:bg-green-600 text-black"
                                                onClick={() => onViewReport(candidate.sessionId!)}
                                            >
                                                View Full Report
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
