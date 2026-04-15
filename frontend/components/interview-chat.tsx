"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { MicIcon, MicOffIcon, SendIcon, Loader2Icon, CheckCircle2Icon, Volume2Icon, VolumeXIcon, MonitorIcon } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useTheme } from "@/lib/theme-context"
import { useRouter } from "next/navigation"
import { useProctoring } from "@/hooks/use-proctoring"
import { AudioWaveform } from "@/components/audio-waveform"
import { InterviewGuidance } from "@/components/interview-guidance"
import { CameraSetup } from "@/components/camera-setup"
import { VideoPreviewOverlay } from "@/components/video-preview-overlay"
import { ProctoringMonitor } from "@/components/proctoring-monitor"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  questionNumber?: number
  stage?: number
  feedback?: string
  qualityScore?: number
}

interface InterviewChatProps {
  sessionId: string
  onEndInterview?: () => void
}

export function InterviewChat({ sessionId, onEndInterview }: InterviewChatProps) {
  const router = useRouter()
  const { theme } = useTheme()
  const { isFullScreen, enterFullScreen, warnings, tabSwitchCount, isTerminated } = useProctoring({ sessionId, isEnabled: true })

  // Interview flow states
  const [showGuidance, setShowGuidance] = useState(true)
  const [showCameraSetup, setShowCameraSetup] = useState(false)
  const [interviewStarted, setInterviewStarted] = useState(false)
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])

  // Screen Recording State
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null)
  const screenRecorderRef = useRef<MediaRecorder | null>(null)
  const screenChunksRef = useRef<Blob[]>([])
  const [isScreenRecording, setIsScreenRecording] = useState(false)

  // Voice Interaction Mode State
  const [voiceMode, setVoiceMode] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Whisper Audio Recording State (for STT)
  const voiceRecorderRef = useRef<MediaRecorder | null>(null)
  const voiceChunksRef = useRef<Blob[]>([])
  const [isTranscribing, setIsTranscribing] = useState(false)

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [totalQuestions] = useState(15)
  const [currentStage, setCurrentStage] = useState(1)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const hasStartedRef = useRef(false)

  const bgCard = theme === "dark" ? "bg-[#1a1f26]" : "bg-white"
  const borderColor = theme === "dark" ? "border-gray-700" : "border-gray-200"
  const textPrimary = theme === "dark" ? "text-white" : "text-gray-900"
  const textSecondary = theme === "dark" ? "text-gray-400" : "text-gray-600"

  // Protect against accidental navigation during interview
  useEffect(() => {
    if (!interviewStarted || isComplete) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      alert("⚠️ You cannot use the browser back button during an active interview. To exit, click 'End Interview'.");
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [interviewStarted, isComplete]);

  // Interview flow handlers
  const handleGuidanceAccept = () => {
    setShowGuidance(false)
    setShowCameraSetup(true)
  }

  const handleCameraSetupComplete = async (stream: MediaStream) => {
    console.log('🎥 [CAMERA SETUP] Received stream from setup:', stream)

    // Stop the initial setup stream immediately - we'll re-acquire after screen share
    stream.getTracks().forEach(track => track.stop())

    setShowCameraSetup(false)
    setInterviewStarted(true)

    let actualWebcamStream: MediaStream | null = null

    // 1. Request Screen Share FIRST
    try {
      console.log('🖥️ [SCREEN SHARE] Requesting screen share...')
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'monitor' },
        audio: false
      })

      console.log('🖥️ [SCREEN SHARE] Got display stream')
      setScreenStream(displayStream)

      const screenRecorder = new MediaRecorder(displayStream, {
        mimeType: 'video/webm;codecs=vp9'
      })

      screenRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          screenChunksRef.current.push(event.data)
        }
      }

      screenRecorder.start(1000)
      screenRecorderRef.current = screenRecorder
      setIsScreenRecording(true)
      console.log('🖥️ [SCREEN RECORDING] Started')

      // Handle screen share stop by user
      displayStream.getVideoTracks()[0].onended = () => {
        console.warn('🖥️ [SCREEN SHARE] Stopped by user')
        setIsScreenRecording(false)
      }
    } catch (error) {
      console.error('🖥️ [SCREEN SHARE] Failed:', error)
      alert("Screen sharing is required for the interview proctoring. Please allow it to continue.")
      // We could return here or let them continue with just webcam
    }

    // 2. Re-acquire Webcam AFTER screen share starts
    // Small delay helps avoid browser resource conflicts
    await new Promise(resolve => setTimeout(resolve, 800))

    try {
      console.log('🎥 [WEBCAM] Re-acquiring webcam...')
      actualWebcamStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true
      })

      setMediaStream(actualWebcamStream)

      const recorder = new MediaRecorder(actualWebcamStream, {
        mimeType: 'video/webm;codecs=vp9,opus'
      })

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data)
        }
      }

      recorder.start(1000)
      mediaRecorderRef.current = recorder
      setIsRecording(true)
      console.log('🎥 [WEBCAM RECORDING] Started')

    } catch (error) {
      console.error('🎥 [WEBCAM] Failed to re-acquire:', error)
      alert("Failed to access camera. Please check permissions.")
    }

    // Enter fullscreen for proctoring
    try {
      await enterFullScreen()
    } catch (e) {
      console.warn("Could not enter fullscreen automatically:", e)
    }

    // 3. Trigger interview start via useEffect
    console.log('🏁 [START] Interview marked as started')
  }

  // Cleanup recording on unmount or completion
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      if (screenRecorderRef.current && screenRecorderRef.current.state !== 'inactive') {
        screenRecorderRef.current.stop()
      }
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop())
      }
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop())
      }
      // Cancel any ongoing speech
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [mediaStream, screenStream])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = "en-US"

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results as any)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join("")
        setInput(transcript)
      }

      recognitionRef.current.onerror = (event: { error: string }) => {
        console.error("Speech recognition error:", event.error)
        setIsListening(false)
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }
  }, [])

  // Text-to-Speech function for voice mode
  const speakText = useCallback((text: string) => {
    if (!voiceMode || !window.speechSynthesis) return

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    // Clean text for speech (remove emojis and special chars)
    const cleanText = text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
      .replace(/\n+/g, '. ')
      .trim()

    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.volume = 1.0

    // Try to get a natural voice
    const voices = window.speechSynthesis.getVoices()
    const preferredVoice = voices.find(v =>
      v.name.includes('Google') ||
      v.name.includes('Samantha') ||
      v.name.includes('Alex') ||
      v.lang.startsWith('en')
    )
    if (preferredVoice) utterance.voice = preferredVoice

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => {
      setIsSpeaking(false)
      // Auto-start listening after AI finishes speaking in voice mode
      if (voiceMode && recognitionRef.current && !isComplete) {
        setTimeout(() => {
          try {
            recognitionRef.current.start()
            setIsListening(true)
          } catch (e) {
            console.log('Recognition already started or failed')
          }
        }, 500)
      }
    }
    utterance.onerror = () => setIsSpeaking(false)

    speechSynthRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }, [voiceMode, isComplete])

  // Toggle voice mode
  const toggleVoiceMode = useCallback(() => {
    const newMode = !voiceMode
    setVoiceMode(newMode)
    if (!newMode && window.speechSynthesis) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }, [voiceMode])

  // Start interview (only when ready after camera setup)
  useEffect(() => {
    if (!interviewStarted || hasStartedRef.current) return // Don't start until camera setup complete or if already started

    const startInterview = async () => {
      setIsLoading(true)
      try {
        const response = await api.startInterview(sessionId)
        setCurrentQuestion(response.question_number)
        setCurrentStage(response.stage)
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            content:
              "Welcome to your AI Interview session! We'll have a conversation covering three topics:\n\n📝 Your Resume & Experience\n💡 General & Behavioral Questions\n🎯 HR & Cultural Fit\n\nLet's begin!",
            timestamp: new Date(),
          },
          {
            id: "1",
            role: "assistant",
            content: response.question,
            timestamp: new Date(),
            questionNumber: response.question_number,
            stage: response.stage,
          },
        ])
        // Speak the first question in voice mode
        if (voiceMode) {
          setTimeout(() => speakText(response.question), 500)
        }
      } catch (error) {
        console.error("Failed to start interview:", error)
        // Demo fallback
        const fallbackQuestion = "Hello! Welcome to your interview session. Let's start by you telling me about your experience with the technologies listed on your resume."
        setMessages([
          {
            id: "1",
            role: "assistant",
            content: fallbackQuestion,
            timestamp: new Date(),
            questionNumber: 1,
            stage: 1,
          },
        ])
        setCurrentQuestion(1)
        // Speak fallback in voice mode
        if (voiceMode) {
          setTimeout(() => speakText(fallbackQuestion), 500)
        }
      } finally {
        setIsLoading(false)
      }
    }

    startInterview()
    hasStartedRef.current = true
  }, [sessionId, interviewStarted]) // Removed voiceMode and speakText to prevent re-starting on toggle

  const toggleListening = useCallback(async () => {
    // If already listening, stop and transcribe
    if (isListening) {
      // Stop browser STT
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }

      // Stop voice recorder and send to Whisper
      if (voiceRecorderRef.current && voiceRecorderRef.current.state !== 'inactive') {
        voiceRecorderRef.current.stop()
        // Whisper transcription happens in onstop handler
      }

      setIsListening(false)
      return
    }

    // Start listening: Use both browser STT (for live preview) and record audio for Whisper
    setIsListening(true)
    voiceChunksRef.current = []

    // Start browser STT for live transcript preview (fallback)
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start()
      } catch (e) {
        console.log('Browser STT start failed:', e)
      }
    }

    // Start audio recording for Whisper
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          voiceChunksRef.current.push(e.data)
        }
      }

      recorder.onstop = async () => {
        // Stop the audio stream
        stream.getTracks().forEach(track => track.stop())

        // Create blob and send to Whisper
        if (voiceChunksRef.current.length > 0) {
          setIsTranscribing(true)
          const audioBlob = new Blob(voiceChunksRef.current, { type: 'audio/webm' })
          console.log('🎤 Sending audio to Whisper...', audioBlob.size, 'bytes')

          try {
            const result = await api.transcribeAudio(audioBlob)
            console.log('🎤 Whisper result:', result)

            if (result.success && result.transcription) {
              // Use Whisper transcription (better quality)
              setInput(result.transcription)
              console.log('✅ Using Whisper transcription')
            } else {
              // Whisper failed, keep browser STT result (already in input from onresult)
              console.log('⚠️ Whisper failed, using browser STT fallback')
            }
          } catch (error) {
            console.error('❌ Whisper API error:', error)
            // Browser STT result is already in input as fallback
          }
          setIsTranscribing(false)
        }
      }

      recorder.start()
      voiceRecorderRef.current = recorder
      console.log('🎤 Voice recording started for Whisper')
    } catch (error) {
      console.error('Failed to start voice recording:', error)
      // Continue with browser STT only
    }
  }, [isListening])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    // Stop listening if active
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }

    try {
      const response = await api.sendResponse(sessionId, userMessage.content)

      if (response.is_complete) {
        setIsComplete(true)
        const completionMsg = `Congratulations! You've completed the interview! Thank you for sharing your insights and experiences with us. Your detailed performance report is now available in the Reports section.`
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: completionMsg,
            timestamp: new Date(),
          },
        ])
        // Speak completion message
        if (voiceMode) speakText(completionMsg)
      } else {
        setCurrentQuestion(response.question_number)
        setCurrentStage(response.stage)

        // Add feedback message if provided
        if (response.feedback) {
          setMessages((prev) => [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              role: "assistant" as const,
              content: response.feedback || "Thank you for sharing.",
              timestamp: new Date(),
              qualityScore: response.analysis?.quality_score,
            },
          ] as Message[])
        }

        // Add next question
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 2).toString(),
            role: "assistant",
            content: response.question,
            timestamp: new Date(),
            questionNumber: response.question_number,
            stage: response.stage,
          },
        ])
        // Speak the next question in voice mode
        if (voiceMode) {
          speakText(response.question)
        }
      }
    } catch (error) {
      console.error("Failed to send response:", error)
      // Demo fallback with stage-based questions
      const stageQuestions = {
        1: [
          "Tell me about a project where you used React. What was the most challenging part?",
          "I see you have experience with databases. Can you explain your approach to data modeling?",
          "What's your experience with cloud services? Have you deployed applications to AWS or similar?",
        ],
        2: [
          "How do you approach debugging when you encounter a complex issue?",
          "Describe a time when you had to learn a new technology quickly for a project.",
          "How do you handle disagreements with team members about technical decisions?",
        ],
        3: [
          "Where do you see yourself professionally in the next 5 years?",
          "What motivates you to do your best work?",
          "Do you have any questions about our company or the role?",
        ],
      }

      const stage = currentQuestion <= 5 ? 1 : currentQuestion <= 10 ? 2 : 3
      const stageQs = stageQuestions[stage as keyof typeof stageQuestions]
      const randomQuestion = stageQs[Math.floor(Math.random() * stageQs.length)]

      setCurrentQuestion((prev) => prev + 1)
      if (currentQuestion + 1 > 10) setCurrentStage(3)
      else if (currentQuestion + 1 > 5) setCurrentStage(2)

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: randomQuestion,
          timestamp: new Date(),
          questionNumber: currentQuestion + 1,
          stage,
        },
      ])
      // Speak fallback question in voice mode
      if (voiceMode) speakText(randomQuestion)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const getStageInfo = (stage: number) => {
    switch (stage) {
      case 1:
        return { icon: "📝", title: "Your Resume", subtitle: "Experience & Background" }
      case 2:
        return { icon: "💡", title: "General Discussion", subtitle: "Problem Solving & Teamwork" }
      case 3:
        return { icon: "🎯", title: "HR & Cultural Fit", subtitle: "Goals & Aspirations" }
      default:
        return { icon: "💬", title: "Interview", subtitle: "Let's Begin" }
    }
  }

  const getEngagementReaction = (score?: number) => {
    if (!score) return null
    if (score >= 8) return { emoji: "🌟", text: "Excellent insights!" }
    if (score >= 6.5) return { emoji: "💡", text: "Great perspective!" }
    if (score >= 5) return { emoji: "👍", text: "Good response!" }
    return { emoji: "✨", text: "Thanks for sharing!" }
  }

  const getStageColor = (stage: number) => {
    switch (stage) {
      case 1:
        return "bg-blue-500"
      case 2:
        return "bg-purple-500"
      case 3:
        return "bg-green-500"
      default:
        return "bg-cyan-500"
    }
  }

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto">
      {/* Proctoring Overlay - Force Fullscreen */}
      {!isFullScreen && !isComplete && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1a1f26] border border-red-500/50 p-8 rounded-2xl max-w-md text-center shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Interview Paused</h3>
            <p className="text-gray-400 mb-6">
              To ensure interview integrity, full screen mode is required. Please enable full screen to continue.
            </p>
            <Button
              onClick={enterFullScreen}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-6 text-lg"
            >
              Resume Interview
            </Button>
            {warnings > 0 && (
              <p className="text-red-400 text-xs mt-4">
                Warnings issued: {warnings}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Progress Header */}
      <div className={`${bgCard} rounded-xl border ${borderColor} p-4 mb-4`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getStageInfo(currentStage).icon}</span>
            <div>
              <h3 className={`${textPrimary} font-semibold`}>{getStageInfo(currentStage).title}</h3>
              <p className={`${textSecondary} text-xs`}>{getStageInfo(currentStage).subtitle}</p>
            </div>
          </div>

          {/* Voice Mode & Recording Indicators */}
          <div className="flex items-center gap-2">
            {/* Screen Recording Indicator */}
            {isScreenRecording && (
              <div className="flex items-center gap-1 px-2 py-1 bg-red-500/20 rounded-full">
                <MonitorIcon className="w-4 h-4 text-red-400" />
                <span className="text-xs text-red-400 animate-pulse">REC</span>
              </div>
            )}

            {/* Speaking Indicator */}
            {isSpeaking && (
              <div className="flex items-center gap-1 px-2 py-1 bg-cyan-500/20 rounded-full">
                <Volume2Icon className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span className="text-xs text-cyan-400">Speaking...</span>
              </div>
            )}

            {/* Voice Mode Toggle */}
            <Button
              onClick={toggleVoiceMode}
              variant="ghost"
              size="sm"
              className={cn(
                "rounded-full px-3",
                voiceMode
                  ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                  : `${textSecondary} hover:text-white hover:bg-gray-700`
              )}
              title={voiceMode ? "Disable Voice Mode (AI will stop speaking)" : "Enable Voice Mode (AI will speak questions)"}
            >
              {voiceMode ? <Volume2Icon className="w-4 h-4 mr-1" /> : <VolumeXIcon className="w-4 h-4 mr-1" />}
              <span className="text-xs">{voiceMode ? "Voice On" : "Voice Off"}</span>
            </Button>
            {interviewStarted && (
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  if (window.confirm("Are you sure you want to end the interview? Your progress will be saved and a report generated.")) {
                    try {
                      await api.terminateInterview(sessionId, "User requested early termination")
                      if (onEndInterview) onEndInterview()
                    } catch (e) {
                      console.error("Failed to terminate:", e)
                    }
                  }
                }}
              >
                End Interview
              </Button>
            )}
          </div>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-cyan-500 via-purple-500 to-green-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${(currentQuestion / totalQuestions) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs">
          <span className={cn(currentStage >= 1 ? "text-cyan-400" : textSecondary)}>📝 Resume</span>
          <span className={cn(currentStage >= 2 ? "text-purple-400" : textSecondary)}>💡 General</span>
          <span className={cn(currentStage >= 3 ? "text-green-400" : textSecondary)}>🎯 HR</span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-auto space-y-4 mb-4 pr-2">
        {messages.map((message) => (
          <div key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-3",
                message.role === "user" ? "bg-cyan-500 text-black" : `${bgCard} ${textPrimary} border ${borderColor}`,
              )}
            >
              {/* Engagement reaction for feedback instead of score */}
              {message.qualityScore !== undefined && (() => {
                const reaction = getEngagementReaction(message.qualityScore)
                return reaction ? (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{reaction.emoji}</span>
                    <span className="text-xs text-green-400 font-medium">{reaction.text}</span>
                  </div>
                ) : null
              })()}
              <div className="whitespace-pre-wrap break-words">{message.content}</div>
              <p className={cn("text-xs mt-2", message.role === "user" ? "text-cyan-900" : textSecondary)}>
                {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className={`${bgCard} border ${borderColor} rounded-2xl px-4 py-3`}>
              <div className="flex items-center gap-2">
                <Loader2Icon className="w-5 h-5 animate-spin text-cyan-400" />
                <span className={textSecondary}>Analyzing your response...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {!isComplete && (
        <div className={`flex items-center gap-2 p-4 ${bgCard} rounded-xl border ${borderColor}`}>
          <Button
            onClick={toggleListening}
            variant="ghost"
            size="icon"
            className={cn(
              "rounded-full mr-2",
              isListening ? "bg-red-500/20 text-red-400" : `${textSecondary} hover:${textPrimary}`,
            )}
            title={isListening ? "Stop recording" : "Start voice input"}
          >
            {isListening ? <MicIcon className="w-5 h-5 animate-pulse" /> : <MicOffIcon className="w-5 h-5" />}
          </Button>

          {isListening && <AudioWaveform isListening={true} />}

          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px'
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleKeyPress(e as any)
                // Reset height
                const target = e.target as HTMLTextAreaElement
                target.style.height = '48px'
              }
            }}
            rows={1}
            onCopy={(e) => { e.preventDefault(); alert("Copying is disabled for integrity.") }}
            onPaste={(e) => { e.preventDefault(); alert("Pasting is disabled for integrity.") }}
            placeholder={isListening ? "Listening... speak now" : "Type your response or use voice input..."}
            className={`flex-1 bg-transparent py-3 px-4 border-none ${textPrimary} placeholder:${textSecondary} focus:outline-none focus:ring-0 resize-none min-h-[48px] max-h-[150px] overflow-y-auto leading-relaxed transition-all`}
            disabled={isLoading || !isFullScreen}
          />

          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="bg-cyan-500 hover:bg-cyan-600 text-black rounded-full"
            size="icon"
          >
            <SendIcon className="w-5 h-5" />
          </Button>
        </div>
      )}

      {isComplete && (
        <div
          className={`p-6 ${theme === "dark" ? "bg-green-900/30 border-green-700" : "bg-green-50 border-green-200"} border rounded-xl text-center`}
        >
          <CheckCircle2Icon className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="text-green-500 font-semibold text-lg">Interview Complete!</p>
          <p className={`${textSecondary} text-sm mt-2 mb-4`}>
            Your responses have been analyzed. View your detailed report to see your performance breakdown.
          </p>
          <Button
            onClick={() => router.push(`/report?sessionId=${sessionId}`)}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            View Detailed Report
          </Button>
        </div>
      )}

      {/* Interview Flow Modals */}
      {showGuidance && <InterviewGuidance onAccept={handleGuidanceAccept} onCancel={onEndInterview} />}
      {showCameraSetup && <CameraSetup onComplete={handleCameraSetupComplete} onCancel={onEndInterview} />}

      {/* Video Preview Overlay (shows during interview) */}
      {interviewStarted && <VideoPreviewOverlay stream={mediaStream} isRecording={isRecording} />}

      {/* Enhanced Proctoring Monitor with Face Detection */}
      <ProctoringMonitor
        videoStream={mediaStream}
        isActive={interviewStarted && !isComplete}
        onViolation={(type, details) => {
          console.log(`🚨 Proctoring violation: ${type} - ${details}`)
          api.reportWarning(sessionId, type, details)
          // Warnings are counted by the useProctoring hook + useEffect
        }}
        onWarning={(message) => {
          console.log(`⚠️ Proctoring warning: ${message}`)
        }}
      />
    </div>
  )
}

// Type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}
