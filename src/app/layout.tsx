import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"

const geist = Geist({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "アクタス所沢 スタッフ管理",
  description: "スタッフの月次実績・タスク進捗・MTGログを管理するツール",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={geist.className}>{children}</body>
    </html>
  )
}
