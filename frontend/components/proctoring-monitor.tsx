"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { AlertCircleIcon, CheckCircle2Icon, XIcon } from "@/components/icons"
import { cn } from "@/lib/utils"
import { useTheme } from "@/lib/theme-context"

// Face detection configuration
const FACE_CHECK_INTERVAL = 2000 // Check every 2 seconds
const NO_FACE_WARNING_THRESHOLD = 3 // Warn after 3 consecutive no-face detections
const MULTIPLE_FACE_THRESHOLD = 2 // Warn after detecting multiple faces twice

interface ProctoringMonitorProps {
    videoStream: MediaStream | null
    isActive: boolean
    onViolation: (type: string, details: string) => void
    onWarning: (message: string) => void
}

interface FaceDetectionResult {
    faceCount: number
    confidence: number
    isLookingAway: boolean
}

export function ProctoringMonitor({
    videoStream,
    isActive,
    onViolation,
    onWarning
}: ProctoringMonitorProps) {
    const { theme } = useTheme()
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [status, setStatus] = useState<"loading" | "active" | "warning" | "error">("loading")
    const [statusMessage, setStatusMessage] = useState("Initializing proctoring...")
    const [noFaceCount, setNoFaceCount] = useState(0)
    const [multipleFaceCount, setMultipleFaceCount] = useState(0)
    const [faceApiLoaded, setFaceApiLoaded] = useState(false)
    const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)

    const bgCard = theme === "dark" ? "bg-[#161b22]" : "bg-white"
    const borderColor = theme === "dark" ? "border-gray-800" : "border-gray-200"

    // Initialize face-api.js (if available)
    useEffect(() => {
        const loadFaceApi = async () => {
            try {
                // Check if face-api is available globally
                if (typeof window !== "undefined" && (window as any).faceapi) {
                    const faceapi = (window as any).faceapi

                    // Load models from CDN
                    await Promise.all([
                        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
                        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
                    ])

                    setFaceApiLoaded(true)
                    setStatus("active")
                    setStatusMessage("Face detection active")
                    console.log("✅ Face-api.js loaded successfully")
                } else {
                    // Fallback: Use basic movement detection without face-api
                    console.log("ℹ️ face-api.js not available, using basic proctoring")
                    setFaceApiLoaded(false)
                    setStatus("active")
                    setStatusMessage("Basic proctoring active")
                }
            } catch (error) {
                console.warn("Failed to load face-api.js:", error)
                setFaceApiLoaded(false)
                setStatus("active")
                setStatusMessage("Basic proctoring active")
            }
        }

        if (isActive) {
            loadFaceApi()
        }
    }, [isActive])

    // Setup video stream
    useEffect(() => {
        if (videoStream && videoRef.current) {
            videoRef.current.srcObject = videoStream
            videoRef.current.play().catch(console.error)
        }
    }, [videoStream])

    // Basic face detection using canvas analysis (fallback when face-api not available)
    const detectFaceBasic = useCallback((): FaceDetectionResult => {
        if (!videoRef.current || !canvasRef.current) {
            return { faceCount: 0, confidence: 0, isLookingAway: false }
        }

        const video = videoRef.current
        const canvas = canvasRef.current
        const ctx = canvas.getContext("2d")

        if (!ctx || video.videoWidth === 0) {
            return { faceCount: 0, confidence: 0, isLookingAway: false }
        }

        // Set canvas size
        canvas.width = video.videoWidth / 4 // Downscale for performance
        canvas.height = video.videoHeight / 4

        // Draw current frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        // Basic skin tone detection (simplified face presence check)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const pixels = imageData.data
        let skinPixels = 0
        const totalPixels = canvas.width * canvas.height

        for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i]
            const g = pixels[i + 1]
            const b = pixels[i + 2]

            // Simple skin tone detection (HSV range approximation in RGB)
            if (r > 95 && g > 40 && b > 20 &&
                r > g && r > b &&
                Math.abs(r - g) > 15 &&
                r - b > 15) {
                skinPixels++
            }
        }

        const skinRatio = skinPixels / totalPixels

        // If skin-like pixels make up 5-40% of frame, likely a face is present
        const hasFace = skinRatio > 0.05 && skinRatio < 0.4

        return {
            faceCount: hasFace ? 1 : 0,
            confidence: skinRatio * 2, // Rough confidence estimate
            isLookingAway: false // Can't determine gaze without face-api
        }
    }, [])

    // Advanced face detection using face-api.js
    const detectFaceAdvanced = useCallback(async (): Promise<FaceDetectionResult> => {
        if (!videoRef.current || !faceApiLoaded) {
            return detectFaceBasic()
        }

        try {
            const faceapi = (window as any).faceapi
            const detections = await faceapi.detectAllFaces(
                videoRef.current,
                new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
            ).withFaceLandmarks()

            const faceCount = detections.length
            let isLookingAway = false

            // Check gaze direction using landmarks (if face detected)
            if (faceCount === 1 && detections[0].landmarks) {
                const landmarks = detections[0].landmarks
                const leftEye = landmarks.getLeftEye()
                const rightEye = landmarks.getRightEye()
                const nose = landmarks.getNose()

                // Simple gaze check: compare nose position relative to eyes
                const eyeCenter = (leftEye[0].x + rightEye[3].x) / 2
                const noseX = nose[3].x

                // If nose is too far from eye center, user might be looking away
                const deviation = Math.abs(noseX - eyeCenter)
                isLookingAway = deviation > 30 // Threshold for "looking away"
            }

            return {
                faceCount,
                confidence: faceCount > 0 ? detections[0].detection.score : 0,
                isLookingAway
            }
        } catch (error) {
            console.warn("Face detection error:", error)
            return detectFaceBasic() // Fallback
        }
    }, [faceApiLoaded, detectFaceBasic])

    // Periodic face checking
    useEffect(() => {
        if (!isActive || !videoStream) return

        const checkFace = async () => {
            const result = faceApiLoaded ? await detectFaceAdvanced() : detectFaceBasic()

            if (result.faceCount === 0) {
                const newCount = noFaceCount + 1
                setNoFaceCount(newCount)

                if (newCount >= NO_FACE_WARNING_THRESHOLD) {
                    setStatus("warning")
                    setStatusMessage("⚠️ No face detected")
                    onWarning("No face detected in camera view")

                    if (newCount >= NO_FACE_WARNING_THRESHOLD + 2) {
                        onViolation("no_face", "Face not visible for extended period")
                    }
                }
            } else if (result.faceCount > 1) {
                const newCount = multipleFaceCount + 1
                setMultipleFaceCount(newCount)

                if (newCount >= MULTIPLE_FACE_THRESHOLD) {
                    setStatus("warning")
                    setStatusMessage("⚠️ Multiple faces detected!")
                    onViolation("multiple_faces", `${result.faceCount} faces detected`)
                }
            } else if (result.isLookingAway) {
                setStatus("warning")
                setStatusMessage("⚠️ Please look at the screen")
                onWarning("Candidate may be looking away from screen")
            } else {
                // All good - reset counters
                setNoFaceCount(0)
                setMultipleFaceCount(0)
                setStatus("active")
                setStatusMessage("✓ Proctoring active")
            }
        }

        checkIntervalRef.current = setInterval(checkFace, FACE_CHECK_INTERVAL)

        return () => {
            if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current)
            }
        }
    }, [isActive, videoStream, faceApiLoaded, noFaceCount, multipleFaceCount, detectFaceAdvanced, detectFaceBasic, onWarning, onViolation])

    if (!isActive || !videoStream) return null

    return (
        <div className={cn(
            "fixed bottom-4 left-4 z-40 flex flex-col items-start gap-2",
        )}>
            {/* Proctoring Status Badge */}
            <div className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                status === "active" && "bg-green-500/20 text-green-400 border border-green-500/30",
                status === "warning" && "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 animate-pulse",
                status === "error" && "bg-red-500/20 text-red-400 border border-red-500/30",
                status === "loading" && "bg-gray-500/20 text-gray-400 border border-gray-500/30",
            )}>
                {status === "active" && <CheckCircle2Icon className="w-4 h-4" />}
                {status === "warning" && <AlertCircleIcon className="w-4 h-4" />}
                {status === "error" && <XIcon className="w-4 h-4" />}
                {status === "loading" && <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />}
                <span>{statusMessage}</span>
            </div>

            {/* Hidden elements for detection */}
            <video
                ref={videoRef}
                className="hidden"
                muted
                playsInline
            />
            <canvas ref={canvasRef} className="hidden" />
        </div>
    )
}
