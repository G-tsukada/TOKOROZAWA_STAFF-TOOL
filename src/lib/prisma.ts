import { neonConfig } from "@neondatabase/serverless"
import { PrismaNeon } from "@prisma/adapter-neon"
import { PrismaClient } from "@/generated/prisma/client"
import ws from "ws"

// WebSocket サポート（Node.js 環境用）
neonConfig.webSocketConstructor = ws

const g = globalThis as unknown as { prisma?: PrismaClient }

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL が設定されていません。.env.local を確認してください。")
  }
  const adapter = new PrismaNeon({ connectionString })
  return new PrismaClient({ adapter })
}

// Proxy によるレイジー初期化（リクエスト受信後に env が確実に読まれてから生成）
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!g.prisma) {
      g.prisma = createClient()
    }
    const val = (g.prisma as unknown as Record<string | symbol, unknown>)[prop]
    return typeof val === "function" ? (val as Function).bind(g.prisma) : val
  },
})
