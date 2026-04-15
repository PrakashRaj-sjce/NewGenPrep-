"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
    PlayIcon,
    RefreshCwIcon,
    CheckCircle2Icon,
    XIcon,
    SparklesIcon,
    MicIcon,
    MicOffIcon,
    SendIcon,
    Loader2Icon,
    ChevronLeftIcon
} from "@/components/icons"
import { cn } from "@/lib/utils"
import { useTheme } from "@/lib/theme-context"
import { api } from "@/lib/api"

// Practice question categories with sample questions
const PRACTICE_CATEGORIES = {
    technical: {
        name: "Technical",
        icon: "💻",
        questions: [
            "Explain the difference between REST and GraphQL APIs.",
            "How would you design a scalable microservices architecture?",
            "What are the SOLID principles in software development?",
            "Describe the difference between SQL and NoSQL databases.",
            "How does garbage collection work in modern programming languages?",
            "Explain the concept of containerization and Docker.",
            "What is the difference between synchronous and asynchronous programming?",
            "How would you optimize a slow database query?",
        ]
    },
    behavioral: {
        name: "Behavioral",
        icon: "🤝",
        questions: [
            "Tell me about a time you had a conflict with a team member.",
            "Describe a situation where you had to meet a tight deadline.",
            "How do you handle feedback and criticism?",
            "Give an example of when you showed leadership.",
            "Tell me about a time you failed. What did you learn?",
            "How do you prioritize multiple tasks with competing deadlines?",
            "Describe a situation where you went above and beyond.",
            "How do you handle ambiguity in requirements?",
        ]
    },
    hr: {
        name: "HR & Culture",
        icon: "🎯",
        questions: [
            "Why are you interested in this role?",
            "Where do you see yourself in 5 years?",
            "What motivates you in your work?",
            "What are your salary expectations?",
            "Why are you leaving your current position?",
            "What's your ideal work environment?",
            "How do you handle work-life balance?",
            "What questions do you have for us?",
        ]
    }
}

// Sample ideal answers for comparison
const IDEAL_ANSWER_TIPS: Record<string, string[]> = {
    "conflict": [
        "Describe the specific situation objectively",
        "Explain your approach to resolving it",
        "Highlight the positive outcome",
        "Mention what you learned"
    ],
    "deadline": [
        "Be specific about the deadline and stakes",
        "Explain your prioritization strategy",
        "Show how you managed stress",
        "Describe the successful outcome"
    ],
    "default": [
        "Use the STAR method (Situation, Task, Action, Result)",
        "Be specific with examples and numbers",
        "Keep your answer concise (2-3 minutes)",
        "Connect your answer to the role you're applying for"
    ]
}

interface PracticeInterviewProps {
    onBack: () => void
}

export function PracticeInterview({ onBack }: PracticeInterviewProps) {
    const { theme } = useTheme()
    const [step, setStep] = useState<"mode" | "setup" | "category" | "interview" | "complete">("mode")
    const [practiceMode, setPracticeMode] = useState<"live" | "mock">("live")
    const [targetCompany, setTargetCompany] = useState("")
    const [targetRole, setTargetRole] = useState("")
    const [selectedCategory, setSelectedCategory] = useState<keyof typeof PRACTICE_CATEGORIES | null>(null)

    const [mockPresets, setMockPresets] = useState<Array<{ role: string, company: string, difficulty: string, question_count?: number }>>([])
    const [selectedPreset, setSelectedPreset] = useState<{ role: string, company: string } | null>(null)

    const [questions, setQuestions] = useState<string[]>([])
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [userAnswer, setUserAnswer] = useState("")
    const [isGenerating, setIsGenerating] = useState(false)
    const [isEvaluating, setIsEvaluating] = useState(false)
    const [evaluation, setEvaluation] = useState<any>(null)

    const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set())
    const [selfRatings, setSelfRatings] = useState<Record<number, number>>({})
    const [isRecording, setIsRecording] = useState(false)

    const bgCard = theme === "dark" ? "bg-[#161b22]" : "bg-white"
    const borderColor = theme === "dark" ? "border-gray-800" : "border-gray-200"
    const textPrimary = theme === "dark" ? "text-white" : "text-gray-900"
    const textSecondary = theme === "dark" ? "text-gray-400" : "text-gray-600"

    const currentQuestion = questions[currentQuestionIndex]

    // Load mock presets when mode switch happens
    useEffect(() => {
        if (step === "mode" || step === "setup") {
            api.getMockPresets().then(setMockPresets).catch(console.error)
        }
    }, [step])

    const handleStartSetup = () => {
        if (!targetCompany.trim() || !targetRole.trim()) return
        setStep("category")
    }

    const handleCategorySelect = async (category: keyof typeof PRACTICE_CATEGORIES) => {
        setSelectedCategory(category)
        setIsGenerating(true)
        setStep("interview")

        try {
            const data = await api.generatePracticeQuestions({
                category,
                company: targetCompany,
                role: targetRole,
                count: 5
            })
            setQuestions(data.length > 0 ? data : PRACTICE_CATEGORIES[category].questions)
        } catch (error) {
            console.error("Failed to generate questions, using fallbacks:", error)
            setQuestions(PRACTICE_CATEGORIES[category].questions)
        } finally {
            setIsGenerating(false)
        }
    }

    const handleSubmitAnswer = async () => {
        if (!userAnswer.trim()) return
        setIsEvaluating(true)

        try {
            const result = await api.evaluatePracticeAnswer({
                question: currentQuestion,
                answer: userAnswer,
                category: selectedCategory || "general"
            })
            setEvaluation(result)
            setAnsweredQuestions(prev => new Set([...prev, currentQuestionIndex]))
        } catch (error) {
            console.error("Evaluation failed:", error)
        } finally {
            setIsEvaluating(false)
        }
    }

    const handleRating = (rating: number) => {
        setSelfRatings(prev => ({ ...prev, [currentQuestionIndex]: rating }))
        setEvaluation(null)
        setUserAnswer("")

        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1)
        } else {
            setStep("complete")
        }
    }

    const handleSkip = () => {
        setUserAnswer("")
        setEvaluation(null)
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1)
        } else {
            setStep("complete")
        }
    }

    const recognitionRef = useRef<any>(null)

    // Initialize speech recognition
    useEffect(() => {
        if (typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
            recognitionRef.current = new SpeechRecognition()
            recognitionRef.current.continuous = true
            recognitionRef.current.interimResults = true
            recognitionRef.current.lang = "en-US"

            recognitionRef.current.onresult = (event: any) => {
                const transcript = Array.from(event.results)
                    .map((result: any) => result[0])
                    .map((result: any) => result.transcript)
                    .join("")
                setUserAnswer(transcript)
            }

            recognitionRef.current.onend = () => setIsRecording(false)
        }
    }, [])

    const toggleRecording = useCallback(() => {
        if (isRecording) {
            recognitionRef.current?.stop()
            setIsRecording(false)
        } else {
            try {
                recognitionRef.current?.start()
                setIsRecording(true)
            } catch (e) { console.error(e) }
        }
    }, [isRecording])

    const restartPractice = () => {
        setStep("mode")
        setPracticeMode("live")
        setTargetCompany("")
        setTargetRole("")
        setSelectedCategory(null)
        setSelectedPreset(null)
        setQuestions([])
        setCurrentQuestionIndex(0)
        setUserAnswer("")
        setEvaluation(null)
        setAnsweredQuestions(new Set())
        setSelfRatings({})
    }

    const handleMockPresetSelect = async (role: string, company: string) => {
        setSelectedPreset({ role, company })
        setIsGenerating(true)
        setStep("interview")

        try {
            const mockQuestions = await api.getMockQuestions(role, company)
            setQuestions(mockQuestions.length > 0 ? mockQuestions : ["No questions available for this combination"])
        } catch (error) {
            console.error("Failed to load mock questions:", error)
            setQuestions(["Error loading questions. Please try again."])
        } finally {
            setIsGenerating(false)
        }
    }

    // Mode Selection View
    if (step === "mode") {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="flex items-center gap-4 mb-8">
                    <Button variant="ghost" size="icon" onClick={onBack}>
                        <ChevronLeftIcon className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className={`text-2xl font-bold ${textPrimary}`}>Choose Practice Mode</h1>
                        <p className={textSecondary}>Live AI practice or real company questions</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card
                        className={`${bgCard} ${borderColor} cursor-pointer hover:border-cyan-500/50 transition-all hover:scale-[1.02]`}
                        onClick={() => { setPracticeMode("live"); setStep("setup") }}
                    >
                        <CardContent className="p-8 text-center">
                            <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <SparklesIcon className="w-8 h-8 text-cyan-400" />
                            </div>
                            <h3 className={`text-2xl font-bold ${textPrimary} mb-3`}>Live Practice</h3>
                            <p className={`${textSecondary} mb-6`}>
                                AI generates unique questions based on your target company and role. Never the same questions twice.
                            </p>
                            <ul className={`${textSecondary} text-sm space-y-2 text-left mb-6`}>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2Icon className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                                    Dynamic AI-powered questions
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2Icon className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                                    Company-specific personas
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2Icon className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                                    Real-time AI evaluation
                                </li>
                            </ul>
                            <Button className="w-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500 hover:text-black h-12 font-bold">
                                Start Live Practice
                            </Button>
                        </CardContent>
                    </Card>

                    <Card
                        className={`${bgCard} ${borderColor} cursor-pointer hover:border-green-500/50 transition-all hover:scale-[1.02]`}
                        onClick={() => { setPracticeMode("mock"); setStep("setup") }}
                    >
                        <CardContent className="p-8 text-center">
                            <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <PlayIcon className="w-8 h-8 text-green-400" />
                            </div>
                            <h3 className={`text-2xl font-bold ${textPrimary} mb-3`}>Mock Interview</h3>
                            <p className={`${textSecondary} mb-6`}>
                                Practice with real questions asked at FAANG companies. Curated 15-question sets for specific roles.
                            </p>
                            <ul className={`${textSecondary} text-sm space-y-2 text-left mb-6`}>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2Icon className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                    Real FAANG interview questions
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2Icon className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                    Role-specific question sets
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2Icon className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                    15 curated questions
                                </li>
                            </ul>
                            <Button className="w-full bg-green-500/10 text-green-400 border border-green-500/50 hover:bg-green-500 hover:text-black h-12 font-bold">
                                Start Mock Interview
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    // Step 1: Setup View (Company & Role for live OR Preset picker for mock)
    if (step === "setup") {
        if (practiceMode === "mock") {
            // Mock mode: show preset picker
            return (
                <div className="max-w-5xl mx-auto p-6">
                    <div className="flex items-center gap-4 mb-8">
                        <Button variant="ghost" size="icon" onClick={() => setStep("mode")}>
                            <ChevronLeftIcon className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className={`text-2xl font-bold ${textPrimary}`}>Mock Interview</h1>
                            <p className={textSecondary}>Choose a role & company combination</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {mockPresets.map((preset, idx) => (
                            <Card
                                key={idx}
                                className={`${bgCard} ${borderColor} cursor-pointer hover:border-green-500/50 transition-all hover:scale-[1.02]`}
                                onClick={() => handleMockPresetSelect(preset.role, preset.company)}
                            >
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <h3 className={`text-lg font-bold ${textPrimary} mb-1`}>{preset.company}</h3>
                                            <p className={`${textSecondary} text-sm mb-2`}>{preset.role}</p>
                                        </div>
                                        <div className="px-2 py-1 bg-orange-500/10 text-orange-400 text-xs font-bold rounded">
                                            {preset.difficulty}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <span>{preset.question_count || 15} Questions</span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )
        }

        // Live mode: Company & Role input
        return (
            <div className="max-w-xl mx-auto p-6">
                <div className="flex items-center gap-4 mb-8">
                    <Button variant="ghost" size="icon" onClick={onBack}>
                        <ChevronLeftIcon className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className={`text-2xl font-bold ${textPrimary}`}>Practice Setup</h1>
                        <p className={textSecondary}>Tell us what you're preparing for</p>
                    </div>
                </div>

                <Card className={`${bgCard} ${borderColor} p-6 space-y-6`}>
                    <div className="space-y-4">
                        <div>
                            <label className={`block text-sm font-medium ${textPrimary} mb-2`}>Target Company (e.g. Google, Amazon, Startup)</label>
                            <Input
                                value={targetCompany}
                                onChange={(e) => setTargetCompany(e.target.value)}
                                placeholder="Where are you applying?"
                                className={`bg-transparent ${textPrimary}`}
                            />
                        </div>
                        <div>
                            <label className={`block text-sm font-medium ${textPrimary} mb-2`}>Target Role (e.g. Senior Backend, Product Manager)</label>
                            <Input
                                value={targetRole}
                                onChange={(e) => setTargetRole(e.target.value)}
                                placeholder="What role are you targeting?"
                                className={`bg-transparent ${textPrimary}`}
                            />
                        </div>
                    </div>
                    <Button
                        onClick={handleStartSetup}
                        disabled={!targetCompany.trim() || !targetRole.trim()}
                        className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold h-12"
                    >
                        Next: Choose Category
                    </Button>
                </Card>
            </div>
        )
    }

    // Step 2: Category Selection View
    if (step === "category") {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="flex items-center gap-4 mb-8">
                    <Button variant="ghost" size="icon" onClick={() => setStep("setup")}>
                        <ChevronLeftIcon className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className={`text-2xl font-bold ${textPrimary}`}>{targetCompany} Preparation</h1>
                        <p className={textSecondary}>Preparing as {targetRole}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {Object.entries(PRACTICE_CATEGORIES).map(([key, category]) => (
                        <Card
                            key={key}
                            className={`${bgCard} ${borderColor} cursor-pointer hover:border-cyan-500/50 transition-all hover:scale-[1.02]`}
                            onClick={() => handleCategorySelect(key as keyof typeof PRACTICE_CATEGORIES)}
                        >
                            <CardContent className="p-6 text-center">
                                <span className="text-4xl mb-4 block">{category.icon}</span>
                                <h3 className={`text-xl font-semibold ${textPrimary} mb-2`}>{category.name}</h3>
                                <p className={`${textSecondary} text-sm mb-4`}>Dynamic {targetCompany}-style questions</p>
                                <Button className="w-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500 hover:text-black">
                                    Start Session
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        )
    }

    // Step 3: Interview View
    if (step === "interview") {
        if (isGenerating) {
            return (
                <div className="max-w-2xl mx-auto p-20 text-center">
                    <Loader2Icon className="w-12 h-12 text-cyan-500 animate-spin mx-auto mb-4" />
                    <h2 className={`text-xl font-bold ${textPrimary}`}>Generating {targetCompany} Questions...</h2>
                    <p className={textSecondary}>Crafting a realistic {targetRole} challenge for you.</p>
                </div>
            )
        }

        return (
            <div className="max-w-3xl mx-auto p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={restartPractice}>
                            <ChevronLeftIcon className="w-5 h-5" />
                        </Button>
                        <div>
                            {practiceMode === "mock" && selectedPreset ? (
                                <>
                                    <h2 className={`font-semibold ${textPrimary} flex items-center gap-2`}>
                                        <span className="text-green-400">🎯</span>
                                        {selectedPreset.company} - {selectedPreset.role}
                                    </h2>
                                    <p className={`${textSecondary} text-sm`}>Mock Interview • Question {currentQuestionIndex + 1} of {questions.length}</p>
                                </>
                            ) : (
                                <>
                                    <h2 className={`font-semibold ${textPrimary} flex items-center gap-2`}>
                                        <SparklesIcon className="w-4 h-4 text-cyan-400" />
                                        {targetCompany} {targetRole}
                                    </h2>
                                    <p className={`${textSecondary} text-sm`}>Live Practice • Question {currentQuestionIndex + 1} of {questions.length}</p>
                                </>
                            )}
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleSkip}>Skip →</Button>
                </div>

                <div className="w-full bg-gray-700 rounded-full h-1.5 mb-8">
                    <div className="bg-cyan-500 h-1.5 rounded-full transition-all" style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }} />
                </div>

                <Card className={`${bgCard} ${borderColor} mb-6`}>
                    <CardContent className="p-8">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                <SparklesIcon className="w-6 h-6 text-cyan-400" />
                            </div>
                            <p className={`${textPrimary} text-xl font-medium leading-relaxed`}>{currentQuestion}</p>
                        </div>
                    </CardContent>
                </Card>

                {!evaluation ? (
                    <Card className={`${bgCard} ${borderColor}`}>
                        <CardContent className="p-6">
                            <div className="flex gap-4 mb-4">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={toggleRecording}
                                    className={cn("rounded-xl h-12 w-12", isRecording ? "bg-red-500/20 text-red-400" : "bg-gray-800 text-gray-400")}
                                >
                                    {isRecording ? <MicIcon className="w-6 h-6 animate-pulse" /> : <MicOffIcon className="w-6 h-6" />}
                                </Button>
                                <textarea
                                    value={userAnswer}
                                    onChange={(e) => setUserAnswer(e.target.value)}
                                    placeholder="Type your answer here..."
                                    className={`flex-1 bg-gray-800/50 rounded-xl p-4 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${textPrimary} resize-none`}
                                />
                            </div>
                            <div className="flex justify-between items-center">
                                <p className={`${textSecondary} text-xs`}>Pro-tip: Focus on the STAR method for behavioral questions.</p>
                                <Button
                                    onClick={handleSubmitAnswer}
                                    disabled={!userAnswer.trim() || isEvaluating}
                                    className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold rounded-xl px-8"
                                >
                                    {isEvaluating ? <Loader2Icon className="w-5 h-5 animate-spin mr-2" /> : <SendIcon className="w-5 h-5 mr-2" />}
                                    Submit for AI Review
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className={`${bgCard} ${borderColor} border-cyan-500/30`}>
                        <CardHeader className="pb-2">
                            <CardTitle className={`${textPrimary} flex items-center gap-2`}>
                                <div className="h-8 w-8 bg-green-500/20 text-green-500 rounded-lg flex items-center justify-center"><CheckCircle2Icon className="w-5 h-5" /></div>
                                AI Evaluation Results
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-800/50 p-4 rounded-xl">
                                    <div className="text-2xl font-bold text-cyan-400">{evaluation.relevance_score}/10</div>
                                    <div className={`text-xs ${textSecondary}`}>Relevance</div>
                                </div>
                                <div className="bg-gray-800/50 p-4 rounded-xl">
                                    <div className="text-2xl font-bold text-green-400">{evaluation.quality_score}/10</div>
                                    <div className={`text-xs ${textSecondary}`}>Quality</div>
                                </div>
                            </div>
                            <div className="bg-cyan-500/5 p-4 rounded-xl border border-cyan-500/10">
                                <p className={`${textPrimary} text-sm leading-relaxed`}><span className="font-bold text-cyan-400">Feedback:</span> {evaluation.feedback}</p>
                            </div>

                            <div className="pt-4 border-t border-gray-800">
                                <p className={`${textPrimary} font-medium mb-3`}>How would you rate your confidence in this answer?</p>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map((rating) => (
                                        <Button key={rating} variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => handleRating(rating)}>{rating}</Button>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        )
    }

    // Step 4: Completion View
    if (step === "complete") {
        return (
            <div className="max-w-2xl mx-auto p-6 text-center">
                <div className={`${bgCard} rounded-3xl ${borderColor} border p-12`}>
                    <CheckCircle2Icon className="w-20 h-20 text-green-500 mx-auto mb-6" />
                    <h2 className={`text-3xl font-bold ${textPrimary} mb-4`}>
                        {practiceMode === "mock" ? "Mock Interview Complete!" : "Practice Session Complete!"}
                    </h2>
                    <p className={`${textSecondary} text-lg mb-8`}>
                        {practiceMode === "mock" && selectedPreset
                            ? `You've completed the ${selectedPreset.company} ${selectedPreset.role} interview set.`
                            : `You've practiced ${questions.length} ${targetCompany} questions for ${targetRole}.`
                        }
                    </p>
                    <div className="flex gap-4 justify-center">
                        <Button variant="outline" onClick={restartPractice} className="h-12 rounded-xl px-8"><RefreshCwIcon className="w-4 h-4 mr-2" /> Try Another</Button>
                        <Button className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold h-12 rounded-xl px-8" onClick={onBack}>Back to Dashboard</Button>
                    </div>
                </div>
            </div>
        )
    }

    return null
}

declare global {
    interface Window {
        SpeechRecognition: any
        webkitSpeechRecognition: any
    }
}

