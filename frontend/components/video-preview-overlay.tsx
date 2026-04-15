"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface VideoPreviewOverlayProps {
    stream: MediaStream | null
    isRecording?: boolean
}

export function VideoPreviewOverlay({ stream, isRecording }: VideoPreviewOverlayProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [isStreamActive, setIsStreamActive] = useState(true)

    useEffect(() => {
        if (stream && videoRef.current) {
            videoRef.current.srcObject = stream

            // Monitor tracks
            const handleTrackEvent = () => {
                const active = stream.getTracks().every(t => t.readyState === 'live' && t.enabled)
                setIsStreamActive(active)
            }

            stream.getTracks().forEach(t => {
                t.addEventListener('ended', handleTrackEvent)
                t.addEventListener('mute', handleTrackEvent)
                t.addEventListener('unmute', handleTrackEvent)
            })

            return () => {
                stream.getTracks().forEach(t => {
                    t.removeEventListener('ended', handleTrackEvent)
                    t.removeEventListener('mute', handleTrackEvent)
                    t.removeEventListener('unmute', handleTrackEvent)
                })
            }
        }
    }, [stream])

    if (!stream) return null

    return (
        <div className="fixed bottom-4 left-4 z-40 animate-in slide-in-from-left duration-300">
            <div className="relative w-48 h-36 bg-gray-900 rounded-lg overflow-hidden border-2 border-cyan-500/50 shadow-2xl flex items-center justify-center">
                {!isStreamActive && (
                    <div className="absolute inset-0 z-10 bg-gray-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-2">
                        <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center mb-2">
                            <span className="text-red-500 text-lg">!</span>
                        </div>
                        <p className="text-[10px] text-red-400 font-medium">Camera lost or hidden</p>
                    </div>
                )}

                {/* Video */}
                <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className={cn("w-full h-full object-cover transition-opacity duration-300", !isStreamActive ? "opacity-20" : "opacity-100")}
                    style={{ transform: 'scaleX(-1)' }} // Mirror effect
                />

                {/* Recording Indicator */}
                {isRecording && (
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-red-500/90 text-white px-2 py-1 rounded-full text-xs font-medium z-20">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                        REC
                    </div>
                )}

                {/* Camera Label */}
                <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded text-xs text-center z-20">
                    Your Camera
                </div>
            </div>
        </div>
    )
}
