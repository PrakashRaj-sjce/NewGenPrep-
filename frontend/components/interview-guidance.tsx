"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { CheckCircle2Icon } from "@/components/icons"

interface InterviewGuidanceProps {
    onAccept: () => void
    onCancel?: () => void
    candidateName?: string
}

export function InterviewGuidance({ onAccept, onCancel, candidateName }: InterviewGuidanceProps) {
    const [accepted, setAccepted] = useState(false)
    const [scrolledToBottom, setScrolledToBottom] = useState(false)
    const rulesRef = useRef<HTMLDivElement>(null)

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const element = e.currentTarget
        const isBottom = Math.abs(element.scrollHeight - element.scrollTop - element.clientHeight) < 10
        if (isBottom) {
            setScrolledToBottom(true)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#1a1f26] border border-cyan-500/30 rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="p-4 border-b border-gray-700 relative">
                    {onCancel && (
                        <button 
                            onClick={onCancel}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-10 h-10 bg-cyan-500/20 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Interview Guidelines & Rules</h2>
                            {candidateName && <p className="text-gray-400 text-xs">Welcome, {candidateName}</p>}
                        </div>
                    </div>
                    <p className="text-gray-300 text-xs">Please read carefully before proceeding</p>
                </div>

                {/* Rules Content - Scrollable */}
                <div
                    ref={rulesRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto p-4 space-y-4 text-gray-200 text-sm"
                >
                    {/* Introduction */}
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-blue-400 mb-2">📋 About This Interview</h3>
                        <p className="text-sm">
                            This is a proctored AI-powered interview session. Your responses will be analyzed for technical competency,
                            communication skills, and overall performance. The session is monitored to ensure integrity and fairness.
                        </p>
                    </div>

                    {/* Required Items */}
                    <div>
                        <h3 className="text-lg font-semibold text-green-400 mb-3 flex items-center gap-2">
                            <span>✅</span> Required for Interview
                        </h3>
                        <ul className="space-y-2 text-sm">
                            <li className="flex items-start gap-2">
                                <span className="text-green-400 mt-0.5">•</span>
                                <span><strong className="text-white">Working Webcam:</strong> Camera must be ON and visible throughout the interview</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-400 mt-0.5">•</span>
                                <span><strong className="text-white">Working Microphone:</strong> Required for voice input and analysis</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-400 mt-0.5">•</span>
                                <span><strong className="text-white">Stable Internet:</strong> Minimum 2 Mbps connection recommended</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-400 mt-0.5">•</span>
                                <span><strong className="text-white">Quiet Environment:</strong> Minimize background noise and distractions</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-400 mt-0.5">•</span>
                                <span><strong className="text-white">Full Screen Mode:</strong> Required throughout the interview</span>
                            </li>
                        </ul>
                    </div>

                    {/* Prohibited Actions */}
                    <div>
                        <h3 className="text-lg font-semibold text-red-400 mb-3 flex items-center gap-2">
                            <span>⛔</span> Strictly Prohibited
                        </h3>
                        <ul className="space-y-2 text-sm">
                            <li className="flex items-start gap-2">
                                <span className="text-red-400 mt-0.5">•</span>
                                <span><strong className="text-white">Tab Switching:</strong> Leaving this page or opening other tabs</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-red-400 mt-0.5">•</span>
                                <span><strong className="text-white">Developer Tools:</strong> Opening browser console, inspector, or view source</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-red-400 mt-0.5">•</span>
                                <span><strong className="text-white">Copy/Paste:</strong> Copying questions or pasting prepared answers</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-red-400 mt-0.5">•</span>
                                <span><strong className="text-white">External Assistance:</strong> Getting help from others or external resources</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-red-400 mt-0.5">•</span>
                                <span><strong className="text-white">Exiting Fullscreen:</strong> Minimizing or exiting fullscreen mode</span>
                            </li>
                        </ul>
                    </div>

                    {/* Consequences */}
                    <div>
                        <h3 className="text-lg font-semibold text-orange-400 mb-3 flex items-center gap-2">
                            <span>⚠️</span> Violation Consequences
                        </h3>
                        <div className="space-y-3 text-sm">
                            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                                <p className="font-semibold text-orange-300 mb-1">Tab Switching Policy:</p>
                                <ul className="space-y-1 ml-4">
                                    <li><span className="text-yellow-400">1st violation:</span> Warning issued</li>
                                    <li><span className="text-orange-400">2nd violation:</span> Final warning issued</li>
                                    <li><span className="text-red-400">3rd violation:</span> <strong>Interview automatically terminated</strong></li>
                                </ul>
                            </div>
                            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                                <p className="font-semibold text-red-300 mb-1">All Other Violations:</p>
                                <p>Logged and reported to the interviewer. May result in interview disqualification.</p>
                            </div>
                        </div>
                    </div>

                    {/* Interview Process */}
                    <div>
                        <h3 className="text-lg font-semibold text-cyan-400 mb-3 flex items-center gap-2">
                            <span>📝</span> Interview Process
                        </h3>
                        <ol className="space-y-2 text-sm list-decimal list-inside">
                            <li><strong className="text-white">Camera/Mic Setup:</strong> Grant permissions and verify video preview</li>
                            <li><strong className="text-white">Interview Stages:</strong> Resume-based → General → HR questions</li>
                            <li><strong className="text-white">Response Time:</strong> Take your time to provide thoughtful answers</li>
                            <li><strong className="text-white">Voice or Text:</strong> You can respond via voice input or typing</li>
                            <li><strong className="text-white">Completion:</strong> View your detailed report after finishing</li>
                        </ol>
                    </div>

                    {/* Recording Notice */}
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-purple-400 mb-2 flex items-center gap-2">
                            <span>🎥</span> Recording Notice
                        </h3>
                        <p className="text-sm">
                            <strong className="text-white">This interview will be recorded.</strong> Audio and video will be captured
                            throughout the session for quality assurance and analysis. By proceeding, you consent to this recording.
                        </p>
                    </div>

                    {/* Data Privacy */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-300 mb-2">🔒 Privacy & Data</h3>
                        <p className="text-sm text-gray-400">
                            Your interview data, including recordings, will be stored securely and used solely for evaluation purposes.
                            Data is encrypted and access is restricted to authorized personnel only.
                        </p>
                    </div>
                </div>

                {/* Footer - Acceptance */}
                <div className="p-4 border-t border-gray-700 bg-[#151a1f]">
                    {!scrolledToBottom && (
                        <p className="text-yellow-400 text-xs mb-2 text-center">
                            ⬇️ Please scroll to read all guidelines
                        </p>
                    )}

                    <label className="flex items-start gap-3 mb-4 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={accepted}
                            onChange={(e) => setAccepted(e.target.checked)}
                            disabled={!scrolledToBottom}
                            className="mt-1 w-5 h-5 rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <span className={`text-sm ${scrolledToBottom ? 'text-white' : 'text-gray-500'} group-hover:text-cyan-400 transition-colors`}>
                            I have read and understand all the interview guidelines, rules, and regulations. I agree to comply with all requirements
                            and understand that violations may result in interview termination. I consent to audio/video recording of this session.
                        </span>
                    </label>

                    <div className="flex gap-2">
                        <Button
                            onClick={onAccept}
                            disabled={!accepted || !scrolledToBottom}
                            className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold py-5 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {accepted && scrolledToBottom ? (
                                <>
                                    <CheckCircle2Icon className="w-5 h-5 mr-2" />
                                    Proceed to Camera Setup
                                </>
                            ) : (
                                "Read & Accept to Continue"
                            )}
                        </Button>
                    </div>

                    <p className="text-gray-500 text-xs text-center mt-3">
                        By clicking "Proceed", you acknowledge understanding and acceptance of all terms
                    </p>
                </div>
            </div>
        </div>
    )
}
