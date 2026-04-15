"use client"

import { cn } from "@/lib/utils"

export function AudioWaveform({ isListening }: { isListening: boolean }) {
    return (
        <div className="flex items-center gap-1 h-8">
            {[1, 2, 3, 4, 5].map((i) => (
                <div
                    key={i}
                    className={cn(
                        "w-1 bg-cyan-400 rounded-full transition-all duration-150",
                        isListening ? "animate-wave" : "h-1 opacity-50"
                    )}
                    style={{
                        animationDelay: `${i * 0.1}s`,
                    }}
                />
            ))}
            <style jsx>{`
        @keyframes wave {
          0%, 100% { height: 8px; opacity: 0.5; }
          50% { height: 24px; opacity: 1; }
        }
        .animate-wave {
          animation: wave 1s infinite ease-in-out;
        }
      `}</style>
        </div>
    )
}
