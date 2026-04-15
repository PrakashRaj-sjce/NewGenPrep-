"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import dynamic from "next/dynamic"
import { useSearchParams, useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Loader2Icon,
  SendIcon,
  MicIcon,
  MicOffIcon,
  CheckCircle2Icon,
} from "@/components/icons"

// Dynamically import Monaco to avoid SSR issues
const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false })

// ====================== CHALLENGE BANK ======================
// Real-world debugging challenges with intentionally broken code

interface CodeChallenge {
  id: string
  title: string
  description: string
  difficulty: "Easy" | "Medium" | "Hard"
  language: string
  buggyCode: string
  hints: string[]
  expectedBehavior: string
  category: "debug" | "feature"
}

const CHALLENGES: CodeChallenge[] = [
  {
    id: "debug-1",
    title: "Fix the Shopping Cart Total",
    description:
      "This function calculates the total price of items in a shopping cart, but it returns the wrong amount when there are discounted items. Find the bug and fix it.",
    difficulty: "Easy",
    language: "python",
    buggyCode: `def calculate_cart_total(items):
    """Calculate total price with discounts applied.
    Each item: {"name": str, "price": float, "quantity": int, "discount": float (0-1)}
    """
    total = 0
    for item in items:
        price = item["price"] * item["quantity"]
        discount = item.get("discount", 0)
        # Apply discount
        total += price * discount  # BUG: Should be (1 - discount)
    return round(total, 2)

# Test
cart = [
    {"name": "Laptop", "price": 999.99, "quantity": 1, "discount": 0.1},
    {"name": "Mouse", "price": 29.99, "quantity": 2, "discount": 0},
    {"name": "Keyboard", "price": 79.99, "quantity": 1, "discount": 0.2},
]

print(f"Cart total: \${calculate_cart_total(cart)}")
# Expected: $1023.98 (999.99*0.9 + 29.99*2 + 79.99*0.8)`,
    hints: [
      "Look at how the discount is applied to the price.",
      "A 10% discount means you pay 90% of the price. What does multiplying by `discount` give you?",
    ],
    expectedBehavior: "Should print $1023.98",
    category: "debug",
  },
  {
    id: "debug-2",
    title: "Fix the User Authentication Middleware",
    description:
      "This Express-style middleware validates JWT tokens, but it lets expired tokens through and crashes on malformed headers. Find and fix all the bugs.",
    difficulty: "Medium",
    language: "javascript",
    buggyCode: `// Simulated JWT decoder (for demonstration)
function decodeToken(token) {
    // Simple base64 decode simulation
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return {
        userId: "user_123",
        email: "demo@test.com",
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
        role: "admin"
    };
}

function authMiddleware(req) {
    const authHeader = req.headers.authorization;

    // BUG 1: No check if authHeader exists
    const token = authHeader.split(" ")[1]; // Crashes if no header

    const decoded = decodeToken(token);

    // BUG 2: No check if token expired
    // BUG 3: No null check on decoded

    req.user = decoded;
    return { success: true, user: req.user };
}

// Test cases
console.log("Test 1 - Valid header:");
console.log(authMiddleware({ headers: { authorization: "Bearer abc.def.ghi" } }));

console.log("\\nTest 2 - No header:");
try {
    console.log(authMiddleware({ headers: {} }));
} catch (e) {
    console.log("CRASHED:", e.message);
}

console.log("\\nTest 3 - Expired token should fail:");
console.log(authMiddleware({ headers: { authorization: "Bearer abc.def.ghi" } }));`,
    hints: [
      "What happens when `req.headers.authorization` is undefined?",
      "Check the `exp` claim — is the token still valid?",
      "What if `decodeToken` returns null?",
    ],
    expectedBehavior:
      "Test 1: Should reject (expired). Test 2: Should return auth error. Test 3: Should reject (expired).",
    category: "debug",
  },
  {
    id: "feature-1",
    title: "Implement a Rate Limiter",
    description:
      "You're given an incomplete rate limiter class. Implement the `is_allowed` method that enforces a maximum number of requests per time window. The skeleton is provided — fill in the logic.",
    difficulty: "Hard",
    language: "python",
    buggyCode: `import time

class RateLimiter:
    """
    Sliding window rate limiter.
    max_requests: maximum number of requests allowed
    window_seconds: time window in seconds
    """
    def __init__(self, max_requests, window_seconds):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests = {}  # user_id -> list of timestamps

    def is_allowed(self, user_id):
        """
        TODO: Implement this method.
        Returns True if the request is allowed, False if rate limited.

        Steps:
        1. Get current time
        2. Clean up old requests outside the window
        3. Check if number of recent requests < max_requests
        4. If allowed, record the new request timestamp
        """
        pass  # YOUR CODE HERE

# Test the rate limiter
limiter = RateLimiter(max_requests=3, window_seconds=5)

print("Request 1:", limiter.is_allowed("user_1"))  # True
print("Request 2:", limiter.is_allowed("user_1"))  # True
print("Request 3:", limiter.is_allowed("user_1"))  # True
print("Request 4:", limiter.is_allowed("user_1"))  # False (rate limited!)
print("Request 5:", limiter.is_allowed("user_2"))  # True (different user)

time.sleep(6)
print("\\nAfter waiting 6 seconds...")
print("Request 6:", limiter.is_allowed("user_1"))  # True (window expired)`,
    hints: [
      "Use `time.time()` to get the current timestamp.",
      "Filter out timestamps that are older than `current_time - window_seconds`.",
      "Don't forget to append the new timestamp when a request is allowed.",
    ],
    expectedBehavior:
      "First 3 requests: True, 4th: False (rate limited), user_2: True, after sleep: True",
    category: "feature",
  },
]

// ====================== MAIN COMPONENT ======================

export default function TechnicalInterviewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("sessionId") || ""

  // Challenge state
  const [selectedChallenge, setSelectedChallenge] = useState<CodeChallenge | null>(null)
  const [code, setCode] = useState("")
  const [language, setLanguage] = useState("python")

  // Execution state
  const [output, setOutput] = useState("")
  const [isRunning, setIsRunning] = useState(false)

  // AI Chat state
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string; timestamp: Date }>
  >([])
  const [chatInput, setChatInput] = useState("")
  const [isChatLoading, setIsChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Hint tracking
  const [hintsUsed, setHintsUsed] = useState(0)

  // Layout state
  const [terminalHeight, setTerminalHeight] = useState(200)

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  // Protect against accidental navigation during interview
  useEffect(() => {
    if (!selectedChallenge) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      alert("⚠️ You cannot use the browser back button during an active technical interview. To exit, use the navigation menu.");
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [selectedChallenge]);

  // ====================== CHALLENGE SELECTION ======================
  const selectChallenge = (challenge: CodeChallenge) => {
    setSelectedChallenge(challenge)
    setCode(challenge.buggyCode)
    setLanguage(challenge.language)
    setOutput("")
    setHintsUsed(0)
    setChatMessages([
      {
        role: "assistant",
        content: `👋 Welcome to your Round 2 Technical Assessment!\n\n**Challenge: ${challenge.title}**\n${challenge.description}\n\n**Expected Behavior:** ${challenge.expectedBehavior}\n\nStart by reading the code carefully. When you're ready, run it to see the current (buggy) output. I'm here as your AI pair-programming partner — explain your thought process as you debug.\n\nGood luck! 🚀`,
        timestamp: new Date(),
      },
    ])
  }

  // ====================== CODE EXECUTION ======================
  const runCode = async () => {
    setIsRunning(true)
    setOutput("⏳ Running code...\n")

    try {
      const result = await api.executeCode(language, code)
      if (result.success) {
        setOutput(result.output || "(No output)")
      } else {
        setOutput(`❌ Error: ${result.error || "Execution failed"}\n${result.output || ""}`)
      }
    } catch (err) {
      setOutput(`❌ Failed to execute: ${err}`)
    } finally {
      setIsRunning(false)
    }
  }

  // ====================== AI CHAT ======================
  const sendChatMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return

    const userMsg = chatInput.trim()
    setChatInput("")
    setChatMessages((prev) => [
      ...prev,
      { role: "user", content: userMsg, timestamp: new Date() },
    ])
    setIsChatLoading(true)

    try {
      // Send code context + message to the AI via the interview respond endpoint
      const codeContext = `[ROUND 2 - CODING ASSESSMENT]\n[Challenge: ${selectedChallenge?.title}]\n[Language: ${language}]\n[Current Code]:\n\`\`\`${language}\n${code}\n\`\`\`\n[Execution Output]: ${output}\n\n[Candidate Message]: ${userMsg}`

      const response = await api.sendResponse(sessionId, codeContext)

      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            response.feedback || response.question || "I see your approach. Keep going!",
          timestamp: new Date(),
        },
      ])
    } catch {
      // Fallback AI response when backend is unavailable
      const fallbackResponses = [
        "Good thinking! Can you walk me through what you expect each line to do?",
        "I see you're making changes. What specific bug are you targeting with this fix?",
        "Before running the code, can you explain your thought process? What do you think the root cause is?",
        "That's an interesting approach. Have you considered edge cases?",
        "Nice progress! Try running the code to verify your fix works.",
      ]
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)],
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsChatLoading(false)
    }
  }

  // ====================== HINT SYSTEM ======================
  const requestHint = () => {
    if (!selectedChallenge) return
    if (hintsUsed >= selectedChallenge.hints.length) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "You've used all available hints for this challenge. Try your best to solve it from here!",
          timestamp: new Date(),
        },
      ])
      return
    }
    const hint = selectedChallenge.hints[hintsUsed]
    setHintsUsed((prev) => prev + 1)
    setChatMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: `💡 **Hint ${hintsUsed + 1}/${selectedChallenge.hints.length}:** ${hint}`,
        timestamp: new Date(),
      },
    ])
  }

  // ====================== CHALLENGE SELECTOR ======================
  if (!selectedChallenge) {
    return (
      <div className="min-h-screen bg-[#0d1117] text-white">
        <div className="max-w-5xl mx-auto p-8">
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-lg flex items-center justify-center text-lg font-bold">
                R2
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  Round 2: Technical Assessment
                </h1>
                <p className="text-gray-400 text-sm mt-1">
                  Debug and build like a real engineer — with AI pair programming
                </p>
              </div>
            </div>
          </div>

          {/* Challenge Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CHALLENGES.map((challenge) => (
              <div
                key={challenge.id}
                onClick={() => selectChallenge(challenge)}
                className="group cursor-pointer bg-[#161b22] border border-gray-800 rounded-xl p-6 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/5 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium",
                      challenge.category === "debug"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-blue-500/20 text-blue-400"
                    )}
                  >
                    {challenge.category === "debug" ? "🐛 Debug" : "🏗️ Build"}
                  </span>
                  <span
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium",
                      challenge.difficulty === "Easy"
                        ? "bg-green-500/20 text-green-400"
                        : challenge.difficulty === "Medium"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-red-500/20 text-red-400"
                    )}
                  >
                    {challenge.difficulty}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-cyan-400 transition-colors">
                  {challenge.title}
                </h3>

                <p className="text-gray-400 text-sm leading-relaxed line-clamp-3">
                  {challenge.description}
                </p>

                <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                  <span className="px-2 py-0.5 bg-gray-800 rounded">
                    {challenge.language}
                  </span>
                  <span>{challenge.hints.length} hints available</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ====================== MAIN IDE LAYOUT ======================
  return (
    <div className="h-screen flex flex-col bg-[#0d1117] text-white overflow-hidden">
      {/* Top Bar */}
      <header className="h-12 bg-[#161b22] border-b border-gray-800 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-gradient-to-br from-cyan-500 to-purple-600 rounded flex items-center justify-center text-xs font-bold">
            R2
          </div>
          <span className="text-sm font-medium text-white">
            {selectedChallenge.title}
          </span>
          <span
            className={cn(
              "px-2 py-0.5 rounded text-xs",
              selectedChallenge.difficulty === "Easy"
                ? "bg-green-500/20 text-green-400"
                : selectedChallenge.difficulty === "Medium"
                  ? "bg-yellow-500/20 text-yellow-400"
                  : "bg-red-500/20 text-red-400"
            )}
          >
            {selectedChallenge.difficulty}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={requestHint}
            className="text-yellow-400 hover:bg-yellow-500/10 text-xs"
            title={`${hintsUsed}/${selectedChallenge.hints.length} hints used`}
          >
            💡 Hint ({selectedChallenge.hints.length - hintsUsed} left)
          </Button>
          <Button
            size="sm"
            onClick={runCode}
            disabled={isRunning}
            className="bg-green-600 hover:bg-green-700 text-white text-xs"
          >
            {isRunning ? (
              <Loader2Icon className="w-3.5 h-3.5 animate-spin mr-1" />
            ) : (
              <span className="mr-1">▶</span>
            )}
            Run Code
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedChallenge(null)}
            className="text-gray-400 text-xs"
          >
            ← Back
          </Button>
        </div>
      </header>

      {/* Main Content: Split Pane */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: AI Chat Panel */}
        <div className="w-[340px] shrink-0 flex flex-col bg-[#161b22] border-r border-gray-800">
          {/* Chat Header */}
          <div className="px-4 py-3 border-b border-gray-800">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              AI Pair Programmer
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Explain your reasoning as you debug
            </p>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "text-sm rounded-lg px-3 py-2.5",
                  msg.role === "user"
                    ? "bg-cyan-500/20 text-cyan-100 ml-4"
                    : "bg-gray-800/80 text-gray-200 mr-2"
                )}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                <p className="text-[10px] text-gray-500 mt-1.5">
                  {msg.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            ))}
            {isChatLoading && (
              <div className="bg-gray-800/80 text-gray-400 text-sm rounded-lg px-3 py-2.5 mr-2 flex items-center gap-2">
                <Loader2Icon className="w-3.5 h-3.5 animate-spin" />
                Thinking...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-3 border-t border-gray-800">
            <div className="flex gap-2">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    sendChatMessage()
                  }
                }}
                placeholder="Explain your approach..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none leading-relaxed transition-all duration-200"
                rows={Math.min(5, Math.max(1, chatInput.split('\n').length))}
                style={{
                  minHeight: "42px",
                  overflowY: chatInput.split('\n').length > 5 ? 'auto' : 'hidden'
                }}
              />
              <Button
                size="sm"
                onClick={sendChatMessage}
                disabled={!chatInput.trim() || isChatLoading}
                className="bg-cyan-500 hover:bg-cyan-600 text-black rounded-lg px-3"
              >
                <SendIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* RIGHT: Code Editor + Terminal */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Problem Description Bar */}
          <div className="bg-[#1c2330] border-b border-gray-800 px-4 py-2.5">
            <p className="text-xs text-gray-400 leading-relaxed">
              <span className="text-cyan-400 font-medium">Task:</span>{" "}
              {selectedChallenge.description}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              <span className="text-green-400">Expected:</span>{" "}
              {selectedChallenge.expectedBehavior}
            </p>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              language={language}
              value={code}
              onChange={(val) => setCode(val || "")}
              theme="vs-dark"
              options={{
                fontSize: 14,
                lineNumbers: "on",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 12 },
                wordWrap: "on",
                renderLineHighlight: "gutter",
                fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
                fontLigatures: true,
                bracketPairColorization: { enabled: true },
                suggest: { showMethods: true, showFunctions: true },
                tabSize: 4,
              }}
            />
          </div>

          {/* Terminal Output */}
          <div
            className="bg-[#0a0e14] border-t border-gray-800 flex flex-col shrink-0"
            style={{ height: terminalHeight }}
          >
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#161b22] border-b border-gray-800">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                </div>
                <span className="text-xs text-gray-400 font-mono">Terminal</span>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setTerminalHeight((h) => Math.min(h + 50, 400))}
                  className="text-gray-500 hover:text-white text-xs px-1"
                >
                  ↑
                </button>
                <button
                  onClick={() => setTerminalHeight((h) => Math.max(h - 50, 100))}
                  className="text-gray-500 hover:text-white text-xs px-1"
                >
                  ↓
                </button>
                <button
                  onClick={() => setOutput("")}
                  className="text-gray-500 hover:text-white text-xs px-2"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 font-mono text-xs">
              {output ? (
                <pre className="text-green-300 whitespace-pre-wrap">{output}</pre>
              ) : (
                <span className="text-gray-600">
                  Click "Run Code" to execute your solution...
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
