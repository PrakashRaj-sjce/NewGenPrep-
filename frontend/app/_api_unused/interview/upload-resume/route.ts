import { type NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get("authorization") || ""
    const formData = await request.formData()

    const res = await fetch(`${BACKEND_URL}/api/interview/upload-resume`, {
      method: "POST",
      headers: {
        ...(auth ? { authorization: auth } : {}),
      },
      body: formData,
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error("[proxy] upload-resume error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
