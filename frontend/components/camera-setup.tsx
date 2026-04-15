"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { useMediaDevices } from "@/hooks/use-media-devices"

interface CameraSetupProps {
    onComplete: (stream: MediaStream) => void
    onCancel?: () => void
}

export function CameraSetup({ onComplete, onCancel }: CameraSetupProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [audioLevel, setAudioLevel] = useState(0)

    const {
        stream,
        hasCamera,
        hasMicrophone,
        cameraPermission,
        micPermission,
        error,
        requestPermissions
    } = useMediaDevices()

    // Set up video preview
    useEffect(() => {
        if (stream && videoRef.current) {
            videoRef.current.srcObject = stream
        }
    }, [stream])

    // Set up audio level visualization
    useEffect(() => {
        if (!stream || !hasMicrophone) return

        const audioContext = new AudioContext()
        const analyser = audioContext.createAnalyser()
        const microphone = audioContext.createMediaStreamSource(stream)
        const dataArray = new Uint8Array(analyser.frequencyBinCount)

        microphone.connect(analyser)
        analyser.fftSize = 256

        const updateAudioLevel = () => {
            analyser.getByteFrequencyData(dataArray)
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length
            setAudioLevel(Math.min(100, (average / 128) * 100))
            requestAnimationFrame(updateAudioLevel)
        }

        updateAudioLevel()

        return () => {
            microphone.disconnect()
            audioContext.close()
        }
    }, [stream, hasMicrophone])

    const handleRequestPermissions = async () => {
        setIsLoading(true)
        try {
            await requestPermissions()
        } catch (error) {
            // Error is handled by the hook
        } finally {
            setIsLoading(false)
        }
    }

    const handleComplete = () => {
        if (stream) {
            onComplete(stream)
        }
    }

    const isReady = stream && hasCamera && hasMicrophone && cameraPermission === 'granted' && micPermission === 'granted'

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-3xl bg-[#0d1117] rounded-3xl overflow-hidden shadow-2xl border border-gray-800 animate-in fade-in zoom-in duration-300 relative flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 md:p-8 text-center relative border-b border-gray-800 bg-[#161b22]">
                    {onCancel && (
                        <button 
                            onClick={onCancel}
                            className="absolute top-6 right-6 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-3">
                        Camera & Microphone Setup
                    </h2>
                    <p className="text-gray-400 max-w-xl mx-auto">Allow access to your camera and microphone to continue</p>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4 overflow-y-auto flex-1 thin-scrollbar">
                    {/* Video Preview */}
                    <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden border-2 border-gray-700">
                        {stream && hasCamera ? (
                            <video
                                ref={videoRef}
                                autoPlay
                                muted
                                playsInline
                                className="w-full h-full object-cover mirror"
                                style={{ transform: 'scaleX(-1)' }} // Mirror effect
                            />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                                <svg className="w-24 h-24 mb-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                </svg>
                                <p className="text-lg font-medium">Camera preview will appear here</p>
                                <p className="text-sm">Click "Allow Access" below to enable your camera</p>
                            </div>
                        )}

                        {/* Status Indicators Overlay */}
                        {stream && (
                            <div className="absolute top-4 right-4 flex gap-2">
                                {hasCamera && (
                                    <div className="bg-green-500/90 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                                        <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                                        Camera Active
                                    </div>
                                )}
                                {hasMicrophone && (
                                    <div className="bg-blue-500/90 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                                        <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                                        Mic Active
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Audio Level Indicator */}
                    {hasMicrophone && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400">Microphone Level</span>
                                <span className="text-cyan-400">{Math.round(audioLevel)}%</span>
                            </div>
                            <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-green-500 to-cyan-500 transition-all duration-100"
                                    style={{ width: `${audioLevel}%` }}
                                />
                            </div>
                            <p className="text-xs text-gray-500">Speak to test your microphone</p>
                        </div>
                    )}

                    {/* Status Messages */}
                    <div className="space-y-3">
                        {/* Camera Status */}
                        <div className={`flex items-center gap-3 p-3 rounded-lg ${hasCamera ? 'bg-green-500/10 border border-green-500/30' : 'bg-gray-800 border border-gray-700'}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${hasCamera ? 'bg-green-500/20' : 'bg-gray-700'}`}>
                                <svg className={`w-5 h-5 ${hasCamera ? 'text-green-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <p className={`font-medium ${hasCamera ? 'text-green-400' : 'text-gray-400'}`}>Camera</p>
                                <p className="text-xs text-gray-500">
                                    {hasCamera ? 'Connected and working' : cameraPermission === 'denied' ? 'Permission denied' : 'Not connected'}
                                </p>
                            </div>
                            {hasCamera && (
                                <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </div>

                        {/* Microphone Status */}
                        <div className={`flex items-center gap-3 p-3 rounded-lg ${hasMicrophone ? 'bg-green-500/10 border border-green-500/30' : 'bg-gray-800 border border-gray-700'}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${hasMicrophone ? 'bg-green-500/20' : 'bg-gray-700'}`}>
                                <svg className={`w-5 h-5 ${hasMicrophone ? 'text-green-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <p className={`font-medium ${hasMicrophone ? 'text-green-400' : 'text-gray-400'}`}>Microphone</p>
                                <p className="text-xs text-gray-500">
                                    {hasMicrophone ? 'Connected and working' : micPermission === 'denied' ? 'Permission denied' : 'Not connected'}
                                </p>
                            </div>
                            {hasMicrophone && (
                                <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <svg className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <div className="flex-1">
                                    <p className="text-red-400 font-medium mb-1">Access Required</p>
                                    <p className="text-sm text-gray-300">{error}</p>
                                    {(cameraPermission === 'denied' || micPermission === 'denied') && (
                                        <p className="text-xs text-gray-400 mt-2">
                                            Please enable camera and microphone in your browser settings and refresh the page.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-700 bg-[#151a1f]">
                    <div className="flex gap-2">
                        {onCancel && (
                            <Button
                                onClick={onCancel}
                                variant="outline"
                                className="flex-1 py-5 text-gray-400 hover:text-white border-gray-700 text-sm"
                            >
                                Cancel
                            </Button>
                        )}

                        {!stream ? (
                            <Button
                                onClick={handleRequestPermissions}
                                disabled={isLoading}
                                className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold py-5 text-base"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Requesting Access...
                                    </>
                                ) : (
                                    'Allow Camera & Microphone'
                                )}
                            </Button>
                        ) : (
                            <Button
                                onClick={handleComplete}
                                disabled={!isReady}
                                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold py-5 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isReady ? (
                                    <>
                                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Start Interview
                                    </>
                                ) : (
                                    'Waiting for Camera & Microphone...'
                                )}
                            </Button>
                        )}
                    </div>

                    {isReady && (
                        <p className="text-green-400 text-xs text-center mt-2 flex items-center justify-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            All systems ready! Click "Start Interview" to begin
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}
