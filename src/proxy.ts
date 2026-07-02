import { NextRequest, NextResponse } from "next/server"

const AUTH_COOKIE = "actus_auth"
const PUBLIC_PATHS = ["/login", "/api/auth"]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ログイン・認証APIは素通し
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const cookie = request.cookies.get(AUTH_COOKIE)
  const secret = process.env.AUTH_SECRET

  if (!cookie || !secret || cookie.value !== secret) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
