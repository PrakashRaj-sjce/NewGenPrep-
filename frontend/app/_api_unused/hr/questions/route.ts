import { type NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export async function GET(request: NextRequest) {
  try {
    const auth = request.headers.get("authorization") || ""
    const res = await fetch(`${BACKEND_URL}/api/hr/questions`, {
      headers: { ...(auth ? { authorization: auth } : {}) },
      cache: "no-store",
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error("[proxy] hr questions GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get("authorization") || ""
    const body = await request.json()
    const res = await fetch(`${BACKEND_URL}/api/hr/questions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(auth ? { authorization: auth } : {}),
      },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error("[proxy] hr questions POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = request.headers.get("authorization") || ""
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const res = await fetch(`${BACKEND_URL}/api/hr/questions?id=${encodeURIComponent(id || "")}`, {
      method: "DELETE",
      headers: { ...(auth ? { authorization: auth } : {}) },
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error("[proxy] hr questions DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = request.headers.get("authorization") || ""
    const body = await request.json()
    const res = await fetch(`${BACKEND_URL}/api/hr/questions`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(auth ? { authorization: auth } : {}),
      },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error("[proxy] hr questions PATCH error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
