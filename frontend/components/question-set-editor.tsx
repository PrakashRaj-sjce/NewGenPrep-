"use client"

import { useState, useEffect } from "react"
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    type DropAnimation,
    type DragEndEvent,
} from "@dnd-kit/core"
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { XIcon, PlusIcon, GripVertical } from "lucide-react" // Using lucide-react directly for specific icons
import { cn } from "@/lib/utils"
import type { QuestionSet } from "@/types"

interface QuestionSetEditorProps {
    initialSet?: QuestionSet | null
    isOpen: boolean
    onClose: () => void
    onSave: (data: Partial<QuestionSet>) => Promise<void>
}

// Sortable Item Component
function SortableQuestionItem({
    id,
    question,
    index,
    onChange,
    onRemove,
}: {
    id: string
    question: { text: string; difficulty: string }
    index: number
    onChange: (field: string, value: string) => void
    onRemove: () => void
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <div ref={setNodeRef} style={style} className="flex items-start gap-3 bg-gray-800/50 p-3 rounded-lg group">
            <div
                {...attributes}
                {...listeners}
                className="mt-2 text-gray-500 hover:text-gray-300 cursor-grab active:cursor-grabbing"
            >
                <GripVertical className="w-5 h-5" />
            </div>

            <div className="flex-1 space-y-2">
                <Input
                    value={question.text}
                    onChange={(e) => onChange("text", e.target.value)}
                    placeholder={`Question #${index + 1}`}
                    className="bg-gray-900 border-gray-700 text-sm"
                />
                <div className="flex items-center gap-2">
                    <select
                        value={question.difficulty}
                        onChange={(e) => onChange("difficulty", e.target.value)}
                        className="bg-gray-900 border border-gray-700 rounded text-xs px-2 py-1 text-gray-300 focus:outline-none focus:ring-1 focus:ring-green-500"
                    >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                    </select>
                </div>
            </div>

            <Button
                variant="ghost"
                size="icon"
                className="text-gray-500 hover:text-red-400 hover:bg-red-900/10 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={onRemove}
            >
                <XIcon className="w-4 h-4" />
            </Button>
        </div>
    )
}

export function QuestionSetEditor({ initialSet, isOpen, onClose, onSave }: QuestionSetEditorProps) {
    const [category, setCategory] = useState("")
    const [questions, setQuestions] = useState<{ id: string; text: string; difficulty: string }[]>([])
    const [isSaving, setIsSaving] = useState(false)

    // Initialize state when initialSet changes or opens
    useEffect(() => {
        if (initialSet) {
            setCategory(initialSet.category)
            setQuestions(
                (initialSet.questions ?? []).map((q, idx) => ({
                    id: `q-${Date.now()}-${idx}`, // Generate stable local IDs
                    text: q.text,
                    difficulty: q.difficulty,
                })),
            )
        } else {
            setCategory("")
            setQuestions([{ id: `q-${Date.now()}`, text: "", difficulty: "intermediate" }])
        }
    }, [initialSet, isOpen])

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    )

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            setQuestions((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id)
                const newIndex = items.findIndex((i) => i.id === over.id)
                return arrayMove(items, oldIndex, newIndex)
            })
        }
    }

    const handleAddQuestion = () => {
        setQuestions([...questions, { id: `q-${Date.now()}`, text: "", difficulty: "intermediate" }])
    }

    const handleUpdateQuestion = (index: number, field: string, value: string) => {
        const newQuestions = [...questions]
        newQuestions[index] = { ...newQuestions[index], [field]: value }
        setQuestions(newQuestions)
    }

    const handleRemoveQuestion = (index: number) => {
        setQuestions(questions.filter((_, i) => i !== index))
    }

    const handleSave = async () => {
        try {
            if (!category.trim()) {
                alert("Please enter a category name")
                return
            }

            const validQuestions = questions.filter(q => q.text.trim().length >= 10)
            if (validQuestions.length === 0) {
                alert("Please add at least one valid question (minimum 10 characters)")
                return
            }

            setIsSaving(true)
            await onSave({
                category,
                questions: validQuestions.map(q => ({ text: q.text, difficulty: q.difficulty, tags: [] }))
            })
            onClose()
        } catch (e) {
            console.error(e)
            alert("Failed to save module")
        } finally {
            setIsSaving(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#161b22] border border-gray-800 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-[#0d1117]/50">
                    <div>
                        <h3 className="text-xl font-bold text-white">
                            {initialSet ? "Edit Module" : "Create New Module"}
                        </h3>
                        <p className="text-sm text-gray-400">
                            {initialSet ? "Update existing questions and settings" : "Define a new question set for interviews"}
                        </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-gray-800">
                        <XIcon className="w-5 h-5" />
                    </Button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 space-y-8">

                    {/* Metadata */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-gray-400">Category Name</Label>
                            <Input
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                placeholder="e.g. System Design, Leadership Principles"
                                className="bg-gray-800 border-gray-700 focus:border-green-500 transition-colors"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-400">Configuration</Label>
                            <div className="p-3 bg-gray-800/50 border border-gray-700/50 rounded-md text-sm text-gray-400 flex items-center justify-between">
                                <span>Auto-balance difficulty</span>
                                <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-xs rounded-full">Active</span>
                            </div>
                        </div>
                    </div>

                    {/* Drag & Drop List */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-white text-base">Questions ({questions.length})</Label>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleAddQuestion}
                                className="text-green-400 hover:text-green-300 hover:bg-green-400/10"
                            >
                                <PlusIcon className="w-4 h-4 mr-2" />
                                Add Question
                            </Button>
                        </div>

                        <div className="bg-[#0d1117] border border-gray-800 rounded-xl p-4 min-h-[300px]">
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext items={questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-3">
                                        {questions.map((q, idx) => (
                                            <SortableQuestionItem
                                                key={q.id}
                                                id={q.id}
                                                question={q}
                                                index={idx}
                                                onChange={(field, val) => handleUpdateQuestion(idx, field, val)}
                                                onRemove={() => handleRemoveQuestion(idx)}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>

                            {questions.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-gray-500 py-12">
                                    <p>No questions added yet.</p>
                                    <Button variant="link" onClick={handleAddQuestion} className="text-green-400">Add your first question</Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-800 bg-[#0d1117] flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-green-500 hover:bg-green-600 text-black px-8 font-medium shadow-lg shadow-green-500/20"
                    >
                        {isSaving ? "Saving..." : "Save Module"}
                    </Button>
                </div>
            </div>
        </div>
    )
}
