"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get("next") ?? "/"

  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    })

    setLoading(false)

    if (res.ok) {
      router.push(next)
      router.refresh()
    } else {
      setError("パスワードが違います")
      setPassword("")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[oklch(0.952_0.032_58)]">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8 space-y-6">
        <div className="text-center space-y-1">
          <p className="text-[10px] font-light tracking-[0.25em] uppercase text-gray-400">
            Actus Tokorozawa
          </p>
          <h1 className="text-lg font-light text-gray-700 tracking-wide">
            スタッフツール
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5 tracking-wide">
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition"
              placeholder="パスワードを入力"
              autoFocus
              required
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-[oklch(0.6_0.15_58)] hover:bg-[oklch(0.55_0.15_58)] disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium transition"
          >
            {loading ? "確認中..." : "ログイン"}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
