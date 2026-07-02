import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  const appPassword = process.env.APP_PASSWORD
  const authSecret = process.env.AUTH_SECRET

  if (!appPassword || !authSecret) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 })
  }

  if (password !== appPassword) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set("actus_auth", authSecret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30日間
    path: "/",
  })
  return res
}
