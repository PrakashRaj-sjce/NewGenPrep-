"use client"

import { useState, useEffect } from "react"
import {
    PlusIcon,
    XIcon,
    CheckCircle2Icon,
    SettingsIcon,
    TargetIcon,
    SparklesIcon
} from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { api, Rubric } from "@/lib/api"

// Competency templates
const COMPETENCY_TEMPLATES = {
    technical: {
        name: "Technical Skills",
        icon: "💻",
        competencies: [
            { name: "Problem Solving", weight: 25, description: "Ability to analyze and solve complex problems" },
            { name: "Code Quality", weight: 20, description: "Writing clean, maintainable, and efficient code" },
            { name: "System Design", weight: 20, description: "Designing scalable and robust systems" },
            { name: "Technical Knowledge", weight: 20, description: "Understanding of core concepts and technologies" },
            { name: "Debugging Skills", weight: 15, description: "Identifying and fixing issues effectively" },
        ]
    },
    behavioral: {
        name: "Behavioral",
        icon: "🤝",
        competencies: [
            { name: "Communication", weight: 25, description: "Clear and effective verbal and written communication" },
            { name: "Teamwork", weight: 20, description: "Collaboration and working well with others" },
            { name: "Leadership", weight: 20, description: "Taking initiative and guiding others" },
            { name: "Adaptability", weight: 20, description: "Flexibility in changing situations" },
            { name: "Problem Resolution", weight: 15, description: "Handling conflicts and challenges" },
        ]
    },
    cultural: {
        name: "Cultural Fit",
        icon: "🎯",
        competencies: [
            { name: "Values Alignment", weight: 30, description: "Alignment with company values and mission" },
            { name: "Work Ethic", weight: 25, description: "Dedication and professional attitude" },
            { name: "Growth Mindset", weight: 25, description: "Willingness to learn and improve" },
            { name: "Initiative", weight: 20, description: "Self-motivation and proactiveness" },
        ]
    }
}

interface LocalCompetency {
    id: string
    name: string
    weight: number
    description: string
}

interface LocalRubric extends Omit<Rubric, "competencies"> {
    competencies: LocalCompetency[]
}

interface ScoringRubricsProps {
    onSave?: (rubric: Rubric) => void
}

export function ScoringRubrics({ onSave }: ScoringRubricsProps) {
    const [rubrics, setRubrics] = useState<LocalRubric[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchRubrics()
    }, [])

    const fetchRubrics = async () => {
        try {
            const data = await api.getRubrics()
            // Map API data to Local state (add IDs to competencies)
            const mapped: LocalRubric[] = data.map(r => ({
                ...r,
                competencies: r.competencies.map((c, i) => ({
                    ...c,
                    id: `${r.id}-comp-${i}`
                }))
            }))
            setRubrics(mapped)
        } catch (error) {
            console.error("Failed to fetch rubrics", error)
        } finally {
            setLoading(false)
        }
    }

    const [showForm, setShowForm] = useState(false)
    const [editingRubric, setEditingRubric] = useState<LocalRubric | null>(null)
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        competencies: [] as LocalCompetency[]
    })

    // Calculate total weight
    const totalWeight = formData.competencies.reduce((sum, c) => sum + c.weight, 0)

    const handleAddCompetency = () => {
        setFormData(prev => ({
            ...prev,
            competencies: [
                ...prev.competencies,
                { id: Date.now().toString(), name: "", weight: 0, description: "" }
            ]
        }))
    }

    const handleRemoveCompetency = (id: string) => {
        setFormData(prev => ({
            ...prev,
            competencies: prev.competencies.filter(c => c.id !== id)
        }))
    }

    const handleCompetencyChange = (id: string, field: keyof LocalCompetency, value: string | number) => {
        setFormData(prev => ({
            ...prev,
            competencies: prev.competencies.map(c =>
                c.id === id ? { ...c, [field]: value } : c
            )
        }))
    }

    const handleApplyTemplate = (templateKey: keyof typeof COMPETENCY_TEMPLATES) => {
        const template = COMPETENCY_TEMPLATES[templateKey]
        setFormData(prev => ({
            ...prev,
            name: prev.name || `${template.name} Rubric`,
            competencies: template.competencies.map((c, i) => ({
                id: `template-${i}`,
                ...c
            }))
        }))
    }

    const handleSave = async () => {
        if (totalWeight !== 100) {
            alert("Total weight must equal 100%")
            return
        }

        try {
            if (editingRubric) {
                // Delete old and create new to simulate update
                await api.deleteRubric(editingRubric.id)
            }

            // Strip IDs for API
            const apiCompetencies = formData.competencies.map(({ id, ...rest }) => rest)

            await api.createRubric({
                name: formData.name,
                description: formData.description,
                competencies: apiCompetencies,
                active: true
            })

            fetchRubrics()
            // Callback with API format (if needed by parent) - creating a dummy ID or re-fetching would be better
            // Ideally parent just refreshes or we rely on fetchRubrics update
            resetForm()
        } catch (error) {
            alert("Failed to save rubric")
        }
    }

    const resetForm = () => {
        setFormData({ name: "", description: "", competencies: [] })
        setEditingRubric(null)
        setShowForm(false)
    }

    const handleEdit = (rubric: LocalRubric) => {
        setEditingRubric(rubric)
        setFormData({
            name: rubric.name,
            description: rubric.description,
            competencies: rubric.competencies
        })
        setShowForm(true)
    }

    const handleToggleActive = async (id: string) => {
        // Toggle logic not supported by simple create/delete API without full re-save
        // For now, we assume backend defaults active=true
        // We could implement patch later
    }

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this rubric?")) {
            try {
                await api.deleteRubric(id)
                fetchRubrics()
            } catch (error) {
                alert("Failed to delete")
            }
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Scoring Rubrics</h2>
                    <p className="text-gray-400 text-sm">Create custom evaluation criteria with weighted competencies</p>
                </div>
                <Button
                    onClick={() => setShowForm(true)}
                    className="bg-green-500 hover:bg-green-600 text-black"
                >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Create Rubric
                </Button>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-auto">
                    <Card className="bg-[#161b22] border-gray-800 w-full max-w-3xl my-8">
                        <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-[#161b22] z-10 border-b border-gray-800">
                            <CardTitle className="text-white">
                                {editingRubric ? "Edit Rubric" : "Create Scoring Rubric"}
                            </CardTitle>
                            <Button variant="ghost" size="icon" onClick={resetForm}>
                                <XIcon className="w-5 h-5" />
                            </Button>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-gray-400 mb-1 block">Rubric Name</label>
                                    <Input
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="e.g., Software Engineer Interview"
                                        className="bg-gray-800 border-gray-700 text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-gray-400 mb-1 block">Description</label>
                                    <Input
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Brief description of this rubric"
                                        className="bg-gray-800 border-gray-700 text-white"
                                    />
                                </div>
                            </div>

                            {/* Competency Templates */}
                            <div>
                                <label className="text-sm text-gray-400 mb-2 block">Quick Start from Template</label>
                                <div className="flex gap-2">
                                    {Object.entries(COMPETENCY_TEMPLATES).map(([key, template]) => (
                                        <Button
                                            key={key}
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleApplyTemplate(key as keyof typeof COMPETENCY_TEMPLATES)}
                                            className="border-gray-700 text-gray-300 hover:bg-gray-800"
                                        >
                                            <span className="mr-2">{template.icon}</span>
                                            {template.name}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            {/* Competencies */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-sm text-gray-400">Competencies</label>
                                    <div className={cn(
                                        "text-sm font-medium px-2 py-1 rounded",
                                        totalWeight === 100
                                            ? "bg-green-500/20 text-green-400"
                                            : totalWeight > 100
                                                ? "bg-red-500/20 text-red-400"
                                                : "bg-yellow-500/20 text-yellow-400"
                                    )}>
                                        Total: {totalWeight}% {totalWeight === 100 ? "✓" : totalWeight > 100 ? "(over)" : `(${100 - totalWeight}% remaining)`}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {formData.competencies.map((comp, index) => (
                                        <div key={comp.id} className="flex gap-3 items-start p-3 bg-gray-800/50 rounded-lg">
                                            <div className="flex-1 grid grid-cols-12 gap-3">
                                                <div className="col-span-4">
                                                    <Input
                                                        value={comp.name}
                                                        onChange={(e) => handleCompetencyChange(comp.id, "name", e.target.value)}
                                                        placeholder="Competency name"
                                                        className="bg-gray-800 border-gray-700 text-white"
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <div className="relative">
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            max={100}
                                                            value={comp.weight}
                                                            onChange={(e) => handleCompetencyChange(comp.id, "weight", parseInt(e.target.value) || 0)}
                                                            className="bg-gray-800 border-gray-700 text-white pr-8"
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                                                    </div>
                                                </div>
                                                <div className="col-span-5">
                                                    <Input
                                                        value={comp.description}
                                                        onChange={(e) => handleCompetencyChange(comp.id, "description", e.target.value)}
                                                        placeholder="Description (optional)"
                                                        className="bg-gray-800 border-gray-700 text-white"
                                                    />
                                                </div>
                                                <div className="col-span-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleRemoveCompetency(comp.id)}
                                                        className="text-red-400 hover:text-red-300 h-10"
                                                    >
                                                        <XIcon className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    <Button
                                        variant="outline"
                                        onClick={handleAddCompetency}
                                        className="w-full border-dashed border-gray-700 text-gray-400"
                                    >
                                        <PlusIcon className="w-4 h-4 mr-2" />
                                        Add Competency
                                    </Button>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4 border-t border-gray-800">
                                <Button variant="outline" onClick={resetForm} className="flex-1">
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    disabled={!formData.name || formData.competencies.length === 0 || totalWeight !== 100}
                                    className="flex-1 bg-green-500 hover:bg-green-600 text-black"
                                >
                                    {editingRubric ? "Update Rubric" : "Create Rubric"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Rubrics List */}
            <div className="grid gap-4">
                {loading ? (
                    <p className="text-gray-400 text-center py-8">Loading...</p>
                ) : rubrics.length === 0 ? (
                    <Card className="bg-[#161b22] border-gray-800">
                        <CardContent className="p-8 text-center">
                            <TargetIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-400">No scoring rubrics yet.</p>
                            <p className="text-gray-500 text-sm">Create a rubric to standardize your interview evaluations.</p>
                        </CardContent>
                    </Card>
                ) : (
                    rubrics.map((rubric) => (
                        <Card key={rubric.id} className={cn(
                            "bg-[#161b22] border-gray-800",
                            rubric.active && "border-green-500/30"
                        )}>
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-lg font-semibold text-white">{rubric.name}</h3>
                                            {rubric.active && (
                                                <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full">
                                                    Active
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-gray-400 text-sm">{rubric.description}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleToggleActive(rubric.id)}
                                            className={rubric.active ? "text-green-400" : "text-gray-400"}
                                        >
                                            {rubric.active ? "Deactivate" : "Activate"}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEdit(rubric)}
                                            className="text-gray-400"
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(rubric.id)}
                                            className="text-red-400"
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </div>

                                {/* Competencies visualization */}
                                <div className="space-y-2">
                                    <div className="text-xs text-gray-500 mb-2">Competencies ({rubric.competencies.length})</div>
                                    <div className="flex gap-1 h-4 rounded-full overflow-hidden bg-gray-800">
                                        {rubric.competencies.map((comp, i) => {
                                            const colors = [
                                                "bg-cyan-500", "bg-green-500", "bg-blue-500",
                                                "bg-purple-500", "bg-yellow-500", "bg-pink-500"
                                            ]
                                            return (
                                                <div
                                                    key={i} // using index locally as template IDs might vary
                                                    className={cn(colors[i % colors.length], "relative group")}
                                                    style={{ width: `${comp.weight}%` }}
                                                    title={`${comp.name}: ${comp.weight}%`}
                                                >
                                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                                                        {comp.name}: {comp.weight}%
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {rubric.competencies.map((comp, i) => {
                                            const colors = [
                                                "text-cyan-400", "text-green-400", "text-blue-400",
                                                "text-purple-400", "text-yellow-400", "text-pink-400"
                                            ]
                                            return (
                                                <span key={i} className={cn("text-xs", colors[i % colors.length])}>
                                                    {comp.name} ({comp.weight}%)
                                                </span>
                                            )
                                        })}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
