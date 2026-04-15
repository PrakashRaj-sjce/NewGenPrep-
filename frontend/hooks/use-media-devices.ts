"use client"

import { useState, useEffect, useRef } from "react"

interface UseMediaDevicesOptions {
    autoStart?: boolean
    onPermissionDenied?: () => void
    onDeviceError?: (error: Error) => void
}

interface MediaDeviceState {
    stream: MediaStream | null
    hasCamera: boolean
    hasMicrophone: boolean
    cameraPermission: 'granted' | 'denied' | 'prompt' | 'checking'
    micPermission: 'granted' | 'denied' | 'prompt' | 'checking'
    error: string | null
    isRecording: boolean
}

export function useMediaDevices(options: UseMediaDevicesOptions = {}) {
    const [state, setState] = useState<MediaDeviceState>({
        stream: null,
        hasCamera: false,
        hasMicrophone: false,
        cameraPermission: 'prompt',
        micPermission: 'prompt',
        error: null,
        isRecording: false
    })

    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const recordedChunksRef = useRef<Blob[]>([])

    // Request camera and microphone permissions
    const requestPermissions = async () => {
        console.log('[useMediaDevices] requestPermissions called')

        // Check if browser supports getUserMedia
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            const errorMsg = 'Your browser does not support camera/microphone access. Please use a modern browser like Chrome, Firefox, or Edge.'
            console.error('[useMediaDevices]', errorMsg)
            setState(prev => ({
                ...prev,
                cameraPermission: 'denied',
                micPermission: 'denied',
                error: errorMsg
            }))
            options.onDeviceError?.(new Error(errorMsg))
            throw new Error(errorMsg)
        }

        setState(prev => ({ ...prev, cameraPermission: 'checking', micPermission: 'checking', error: null }))
        console.log('[useMediaDevices] Requesting camera and microphone...')

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                }
            })

            console.log('[useMediaDevices] Got media stream:', stream)
            const videoTrack = stream.getVideoTracks()[0]
            const audioTrack = stream.getAudioTracks()[0]
            console.log('[useMediaDevices] Video track:', videoTrack)
            console.log('[useMediaDevices] Audio track:', audioTrack)

            setState(prev => ({
                ...prev,
                stream,
                hasCamera: !!videoTrack,
                hasMicrophone: !!audioTrack,
                cameraPermission: 'granted',
                micPermission: 'granted',
                error: null
            }))

            return stream
        } catch (error: any) {
            console.error('[useMediaDevices] Media device error:', error)
            console.error('[useMediaDevices] Error name:', error.name)
            console.error('[useMediaDevices] Error message:', error.message)

            let errorMessage = 'Failed to access camera/microphone'
            let cameraStatus: 'denied' | 'prompt' = 'denied'
            let micStatus: 'denied' | 'prompt' = 'denied'

            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                errorMessage = 'Camera and microphone permissions denied. Please allow access to continue.'
                cameraStatus = 'denied'
                micStatus = 'denied'
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                errorMessage = 'No camera or microphone found on this device.'
            } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
                errorMessage = 'Camera/microphone is already in use by another application.'
            } else if (error.name === 'NotSupportedError') {
                errorMessage = 'Secure context required. Please use HTTPS or localhost.'
            } else {
                errorMessage = `Error: ${error.message || 'Unknown error occurred'}`
            }

            setState(prev => ({
                ...prev,
                cameraPermission: cameraStatus,
                micPermission: micStatus,
                error: errorMessage
            }))

            options.onPermissionDenied?.()
            options.onDeviceError?.(error)

            throw error
        }
    }

    // Start recording
    const startRecording = () => {
        if (!state.stream) {
            console.error('No media stream available')
            return
        }

        try {
            recordedChunksRef.current = []

            const mediaRecorder = new MediaRecorder(state.stream, {
                mimeType: 'video/webm;codecs=vp9,opus'
            })

            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    recordedChunksRef.current.push(event.data)
                }
            }

            mediaRecorder.start(1000) // Capture data every second
            mediaRecorderRef.current = mediaRecorder

            setState(prev => ({ ...prev, isRecording: true }))
        } catch (error) {
            console.error('Recording error:', error)
            setState(prev => ({ ...prev, error: 'Failed to start recording' }))
        }
    }

    // Stop recording and return the blob
    const stopRecording = (): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const mediaRecorder = mediaRecorderRef.current

            if (!mediaRecorder || mediaRecorder.state === 'inactive') {
                reject(new Error('No active recording'))
                return
            }

            mediaRecorder.onstop = () => {
                const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
                setState(prev => ({ ...prev, isRecording: false }))
                resolve(blob)
            }

            mediaRecorder.stop()
        })
    }

    // Stop all tracks and clean up
    const cleanup = () => {
        if (state.stream) {
            state.stream.getTracks().forEach(track => track.stop())
        }

        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop()
        }

        setState({
            stream: null,
            hasCamera: false,
            hasMicrophone: false,
            cameraPermission: 'prompt',
            micPermission: 'prompt',
            error: null,
            isRecording: false
        })
    }

    // Auto-start if requested
    useEffect(() => {
        if (options.autoStart) {
            requestPermissions()
        }

        return () => {
            // Cleanup on unmount
            cleanup()
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    return {
        ...state,
        requestPermissions,
        startRecording,
        stopRecording,
        cleanup
    }
}
