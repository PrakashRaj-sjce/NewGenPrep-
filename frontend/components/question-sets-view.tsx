"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import type { QuestionSet } from "@/types"
import { QuestionSetEditor } from "@/components/question-set-editor"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
    FileTextIcon,
    SettingsIcon,
    TargetIcon,
    ClockIcon,
    PlusIcon,
    Loader2Icon,
    TrashIcon
} from "lucide-react" // Importing direct to match editor style
import { cn } from "@/lib/utils"

export function QuestionSetsView() {
    const [sets, setSets] = useState<QuestionSet[]>([])
    const [loading, setLoading] = useState(true)
    const [editorOpen, setEditorOpen] = useState(false)
    const [editingSet, setEditingSet] = useState<QuestionSet | null>(null)

    const fetchSets = async () => {
        try {
            const data = await api.getQuestionSets()
            setSets(data)
        } catch (error) {
            console.error("Failed to fetch question sets:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchSets()
    }, [])

    const handleCreate = () => {
        setEditingSet(null)
        setEditorOpen(true)
    }

    const handleEdit = (set: QuestionSet) => {
        setEditingSet(set)
        setEditorOpen(true)
    }

    const handleSave = async (data: Partial<QuestionSet>) => {
        if (editingSet) {
            // Update existing
            // Tip: The backend API might need a dedicated update endpoint or reuse create with ID handling
            // For now we assume typical REST update pattern or create-overwrite
            // Since the API client `api.ts` might only have `createQuestionSet` and `updateQuestionSet` (which was toggle status only)
            // We might need to ensure `updateQuestionSet` handles full updates.
            // Checking `api.ts` implementation would be good, but assuming standard `updateQuestionSet` works for now.
            await api.updateQuestionSet(editingSet.id, data)
        } else {
            // Create new
            await api.createQuestionSet(data as any)
        }
        await fetchSets()
    }

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this module? This cannot be undone.")) {
            try {
                await api.deleteQuestionSet(id)
                await fetchSets()
            } catch (e) {
                alert("Failed to delete module")
            }
        }
    }

    const handleToggleActive = async (set: QuestionSet) => {
        try {
            await api.updateQuestionSet(set.id, { isActive: !set.isActive })
            await fetchSets()
        } catch (e) {
            alert("Failed to update status")
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2Icon className="w-8 h-8 animate-spin text-green-400" />
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white">Interview Modules</h2>
                    <p className="text-gray-400 text-sm">Manage question banks and interview structure</p>
                </div>
                <Button
                    className="bg-green-500 hover:bg-green-600 text-black shadow-lg shadow-green-500/20 transition-all hover:scale-105"
                    onClick={handleCreate}
                >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Create Module
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sets.length > 0 ? (
                    sets.map((set) => (
                        <Card key={set.id} className="bg-[#161b22] border-gray-800 hover:border-green-500/50 transition-all duration-300 flex flex-col group hover:-translate-y-1 hover:shadow-xl hover:shadow-green-900/10">
                            <CardContent className="p-6 flex-1 flex flex-col">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center group-hover:bg-green-500/20 group-hover:text-green-400 transition-colors">
                                        <FileTextIcon className="w-6 h-6 text-gray-400 group-hover:text-green-400 transition-colors" />
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-700"
                                            onClick={() => handleEdit(set)}
                                            title="Edit Module"
                                        >
                                            <SettingsIcon className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-gray-400 hover:text-red-400 hover:bg-red-900/20"
                                            onClick={() => handleDelete(set.id)}
                                            title="Delete Module"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                <h3 className="text-lg font-semibold text-white mb-2 capitalize truncate" title={set.category}>
                                    {set.category} Module
                                </h3>

                                <div className="flex items-center gap-4 text-sm text-gray-400 mb-6">
                                    <div className="flex items-center gap-1.5">
                                        <TargetIcon className="w-3.5 h-3.5" />
                                        {set.questionCount} Questions
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <ClockIcon className="w-3.5 h-3.5" />
                                        {new Date(set.updatedAt).toLocaleDateString()}
                                    </div>
                                </div>

                                <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-800">
                                    <span className={cn(
                                        "text-xs px-2.5 py-1 rounded-full font-medium transition-colors",
                                        set.isActive
                                            ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                            : "bg-gray-800 text-gray-500 border border-gray-700"
                                    )}>
                                        {set.isActive ? "Active" : "Draft"}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={cn(
                                            "font-normal text-xs",
                                            set.isActive
                                                ? "text-gray-400 hover:text-white"
                                                : "text-green-400 hover:text-green-300"
                                        )}
                                        onClick={() => handleToggleActive(set)}
                                    >
                                        {set.isActive ? "Deactivate" : "Activate"}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full flex flex-col items-center justify-center py-16 text-center text-gray-500 bg-[#161b22]/30 rounded-2xl border border-dashed border-gray-800">
                        <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mb-4">
                            <FileTextIcon className="w-8 h-8 opacity-50" />
                        </div>
                        <p className="text-lg font-medium text-gray-400 mb-2">No custom modules yet</p>
                        <p className="text-sm max-w-sm mx-auto mb-6">Create your first interview module to start customizing your candidate assessments.</p>
                        <Button
                            className="bg-green-500 hover:bg-green-600 text-black"
                            onClick={handleCreate}
                        >
                            <PlusIcon className="w-4 h-4 mr-2" />
                            Create Module
                        </Button>
                    </div>
                )}
            </div>

            <QuestionSetEditor
                isOpen={editorOpen}
                initialSet={editingSet}
                onClose={() => setEditorOpen(false)}
                onSave={handleSave}
            />
        </div>
    )
}
