"use client"

import { useEffect, useState, useCallback } from "react"
import { api } from "@/lib/api"
import { toast } from "sonner" // Assuming we have sonner or will use window.alert fallback, actually I'll use simple state for now.

interface UseProctoringProps {
    sessionId: string | null
    isEnabled: boolean
}

export function useProctoring({ sessionId, isEnabled }: UseProctoringProps) {
    const [warnings, setWarnings] = useState(0)
    const [isFullScreen, setIsFullScreen] = useState(true)
    const [hasLeftTab, setHasLeftTab] = useState(false)
    const [tabSwitchCount, setTabSwitchCount] = useState(0)
    const [isTerminated, setIsTerminated] = useState(false)

    const MAX_TAB_SWITCHES = 3

    // Report violation wrapper
    const reportViolation = useCallback(async (type: string, message: string) => {
        if (!sessionId) return

        // Optimistic update
        setWarnings(prev => prev + 1)

        // Show user feedback (using native alert loop or toast if available, let's try a custom event or callback later)
        // For now, console log and API call
        console.warn(`[PROCTORING] Violation: ${type}`)

        try {
            await api.reportWarning(sessionId, type, message)
        } catch (e) {
            console.error("Failed to log warning", e)
        }
    }, [sessionId])

    // 1. Tab Switching Detection with Auto-Termination (Visibility API)
    useEffect(() => {
        if (!isEnabled || !sessionId || isTerminated) return

        const handleVisibilityChange = async () => {
            if (document.hidden) {
                const newCount = tabSwitchCount + 1
                setTabSwitchCount(newCount)
                setHasLeftTab(true)

                reportViolation("tab_switch", `Tab switch #${newCount} of ${MAX_TAB_SWITCHES}`)

                if (newCount >= MAX_TAB_SWITCHES) {
                    // AUTO-TERMINATE on 3rd violation
                    setIsTerminated(true)
                    alert(
                        `🚨 INTERVIEW TERMINATED\n\n` +
                        `You have switched tabs ${MAX_TAB_SWITCHES} times.\n\n` +
                        `Your interview has been automatically terminated for integrity violations.\n\n` +
                        `This action has been reported to the interviewer.`
                    )

                    // Call termination API
                    try {
                        await api.terminateInterview(sessionId, 'tab_switching_exceeded', newCount)
                    } catch (e) {
                        console.error('Failed to terminate session', e)
                    }

                    // Redirect to dashboard after 3 seconds
                    setTimeout(() => {
                        window.location.href = '/dashboard/candidate'
                    }, 3000)
                } else {
                    // Show warning for 1st and 2nd violations
                    const remainingSwitches = MAX_TAB_SWITCHES - newCount
                    alert(
                        `⚠️ WARNING ${newCount}/${MAX_TAB_SWITCHES}\n\n` +
                        `Tab switching is prohibited during the interview.\n\n` +
                        `${remainingSwitches} more violation(s) will result in automatic termination.\n\n` +
                        `Please stay on the interview screen at all times.`
                    )
                }
            }
        }

        document.addEventListener("visibilitychange", handleVisibilityChange)
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
    }, [isEnabled, sessionId, reportViolation, tabSwitchCount, isTerminated])

    // 2. Full Screen Enforcement
    const enterFullScreen = async () => {
        try {
            if (document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen()
            }
        } catch (e) {
            console.error("Fullscreen blocked", e)
        }
    }

    useEffect(() => {
        if (!isEnabled || !sessionId) return

        let graceTimer: ReturnType<typeof setTimeout>

        const handleFullScreenChange = () => {
            const isFull = !!document.fullscreenElement
            setIsFullScreen(isFull)
            
            if (!isFull) {
                // Allow a brief 3-second grace period for them to re-enter fullscreen
                graceTimer = setTimeout(() => {
                    if (!document.fullscreenElement) {
                        reportViolation("fullscreen_exit", "User exited full screen mode")
                        alert("⚠️ Warning: You have exited fullscreen mode. Please return to fullscreen immediately or your interview may be terminated.")
                    }
                }, 3000)
            } else {
                // If they re-entered before the timer fired, clear the timeout
                clearTimeout(graceTimer)
            }
        }

        document.addEventListener("fullscreenchange", handleFullScreenChange)
        return () => {
            document.removeEventListener("fullscreenchange", handleFullScreenChange)
            clearTimeout(graceTimer)
        }
    }, [isEnabled, sessionId, reportViolation])

    // 3. Disable Context Menu (Right Click)
    useEffect(() => {
        if (!isEnabled) return

        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault()
            reportViolation("right_click", "Right-click context menu blocked")
        }

        document.addEventListener("contextmenu", handleContextMenu)
        return () => document.removeEventListener("contextmenu", handleContextMenu)
    }, [isEnabled, reportViolation])

    // 4. Block Developer Tools Keyboard Shortcuts
    useEffect(() => {
        if (!isEnabled) return

        const blockDevTools = (e: KeyboardEvent) => {
            // F12 - DevTools
            if (e.key === 'F12') {
                e.preventDefault()
                e.stopPropagation()
                reportViolation("devtools_attempt", "F12 key pressed")
                alert("⛔ Developer tools are disabled during the interview for integrity purposes.")
                return false
            }

            // Ctrl+Shift+I - DevTools Inspector
            if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) {
                e.preventDefault()
                e.stopPropagation()
                reportViolation("devtools_attempt", "Ctrl+Shift+I pressed")
                alert("⛔ Developer tools are disabled during the interview.")
                return false
            }

            // Ctrl+Shift+C - Inspect Element
            if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
                e.preventDefault()
                e.stopPropagation()
                reportViolation("devtools_attempt", "Ctrl+Shift+C pressed")
                alert("⛔ Inspect element is disabled during the interview.")
                return false
            }

            // Ctrl+Shift+J - Console
            if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j')) {
                e.preventDefault()
                e.stopPropagation()
                reportViolation("devtools_attempt", "Ctrl+Shift+J pressed")
                alert("⛔ Console access is disabled during the interview.")
                return false
            }

            // Ctrl+U - View Source
            if (e.ctrlKey && (e.key === 'U' || e.key === 'u')) {
                e.preventDefault()
                e.stopPropagation()
                reportViolation("devtools_attempt", "Ctrl+U pressed")
                alert("⛔ View source is disabled during the interview.")
                return false
            }

            // Cmd+Option+I (Mac DevTools)
            if (e.metaKey && e.altKey && (e.key === 'I' || e.key === 'i')) {
                e.preventDefault()
                e.stopPropagation()
                reportViolation("devtools_attempt", "Cmd+Option+I pressed")
                alert("⛔ Developer tools are disabled during the interview.")
                return false
            }

            // Cmd+Option+C (Mac Inspect)
            if (e.metaKey && e.altKey && (e.key === 'C' || e.key === 'c')) {
                e.preventDefault()
                e.stopPropagation()
                reportViolation("devtools_attempt", "Cmd+Option+C pressed")
                alert("⛔ Inspect element is disabled during the interview.")
                return false
            }
        }

        document.addEventListener('keydown', blockDevTools, true) // Use capture phase
        return () => document.removeEventListener('keydown', blockDevTools, true)
    }, [isEnabled, reportViolation])

    // 5. Detect DevTools Open State
    useEffect(() => {
        if (!isEnabled) return

        let devToolsOpen = false

        const detectDevTools = () => {
            // Method 1: Check window size differences
            const widthThreshold = window.outerWidth - window.innerWidth > 160
            const heightThreshold = window.outerHeight - window.innerHeight > 160

            // Method 2: Console.log timing (DevTools slows it down)
            const start = performance.now()
            // eslint-disable-next-line no-console
            console.clear()
            const consoleTime = performance.now() - start

            const isOpen = widthThreshold || heightThreshold || consoleTime > 10

            if (isOpen && !devToolsOpen) {
                devToolsOpen = true
                reportViolation("devtools_open", "Developer tools detected as open")
                alert("⚠️ Warning: Developer tools detected. Please close them immediately or your interview may be terminated.")
            } else if (!isOpen && devToolsOpen) {
                devToolsOpen = false
            }
        }

        // Check every 2 seconds
        const interval = setInterval(detectDevTools, 2000)
        return () => clearInterval(interval)
    }, [isEnabled, reportViolation])

    return {
        warnings,
        isFullScreen,
        enterFullScreen,
        hasLeftTab,
        tabSwitchCount,
        isTerminated,
        maxTabSwitches: MAX_TAB_SWITCHES
    }
}
