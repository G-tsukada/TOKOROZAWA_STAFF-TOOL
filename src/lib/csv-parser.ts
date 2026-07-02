/**
 * 接客件数スプレッドシート（CSV）パーサー
 *
 * 想定フォーマット（日次・1行1スタッフ1日）:
 *   列: 日付 | 曜日 | 店名 | 社員番号 | 氏名 | 接客件数目標 | 接客件数
 *
 * → 氏名 × 月 でグループ化し、接客件数・目標を合計して返す
 */

export interface CustomerCountRow {
  staffName: string           // CSV の氏名
  customerCount: number       // 月次合計 実績
  customerTarget: number      // 月次合計 目標
  yearMonth: string           // "YYYY-MM"
  matchedStaffId: string | null
  matchedStaffName: string | null
}

export interface CsvImportResult {
  yearMonth: string | null
  rows: CustomerCountRow[]
  error?: string
}

// ─── 氏名（漢字）→ staffId マッピング ────────────────────────────────────────
// 同一人物でも表記ゆれ（川/河 など）に対応するため複数パターンを持つ
const NAME_MAP: Array<{ patterns: string[]; staffId: string; staffName: string }> = [
  { patterns: ["勅使川原", "勅使河原", "テシカワ"], staffId: "s1",   staffName: "勅使川原 純" },
  { patterns: ["鈴木"],                              staffId: "s2",   staffName: "鈴木 さおり" },
  { patterns: ["吉川"],                              staffId: "s3",   staffName: "吉川 夏子" },
  { patterns: ["南澤", "南沢"],                      staffId: "s4",   staffName: "南澤 みづき" },
  { patterns: ["須部"],                              staffId: "s5",   staffName: "須部 馨代" },
  { patterns: ["高橋"],                              staffId: "s6",   staffName: "高橋 佳愛" },
  { patterns: ["佐藤"],                              staffId: "s7",   staffName: "佐藤 みわ" },
  { patterns: ["今泉"],                              staffId: "s8",   staffName: "今泉 美恵子" },
  { patterns: ["森田"],                              staffId: "s9",   staffName: "森田 悦子" },
  { patterns: ["菊地", "菊池"],                      staffId: "s10",  staffName: "菊地 千尋" },
  { patterns: ["塚田"],                              staffId: "mgr1", staffName: "塚田 岳人" },
]

export function matchStaffByName(name: string): { staffId: string; staffName: string } | null {
  const normalized = name.replace(/\s+/g, "")
  for (const entry of NAME_MAP) {
    if (entry.patterns.some((p) => normalized.includes(p))) {
      return { staffId: entry.staffId, staffName: entry.staffName }
    }
  }
  return null
}

// ─── CSV パーサー（簡易実装、二重引用符エスケープ対応） ──────────────────────
function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuote = !inQuote
      }
    } else if (ch === "," && !inQuote) {
      result.push(current.trim())
      current = ""
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

// "7/1", "2026/7/1", "2026-07-01" など → "YYYY-MM"
function dateToYearMonth(dateStr: string, fallbackYear = new Date().getFullYear()): string | null {
  // YYYY/MM/DD or YYYY-MM-DD
  const full = dateStr.match(/^(\d{4})[\/\-](\d{1,2})/)
  if (full) return `${full[1]}-${full[2].padStart(2, "0")}`
  // MM/DD or M/D（年なし）
  const short = dateStr.match(/^(\d{1,2})\/(\d{1,2})$/)
  if (short) return `${fallbackYear}-${short[1].padStart(2, "0")}`
  return null
}

// ─── メイン ──────────────────────────────────────────────────────────────────
export async function parseCustomerCsv(file: File): Promise<CsvImportResult> {
  try {
    const text = await file.text()
    const lines = text.split(/\r?\n/).filter((l) => l.trim())

    if (lines.length < 2) {
      return { yearMonth: null, rows: [], error: "データ行が見つかりません" }
    }

    // ── ヘッダー行を探す ──────────────────────────────────────────────────
    // 「氏名」「接客件数」が含まれる行をヘッダーとして扱う
    let headerIdx = -1
    let headers: string[] = []
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const cols = parseCsvLine(lines[i])
      if (cols.some((c) => c.includes("氏名")) && cols.some((c) => c.includes("接客"))) {
        headerIdx = i
        headers = cols
        break
      }
    }
    if (headerIdx === -1) {
      return {
        yearMonth: null,
        rows: [],
        error: "「氏名」「接客件数」列が見つかりません。CSV の列名を確認してください。",
      }
    }

    // ── 必要な列インデックスを特定 ────────────────────────────────────────
    const colIdx = (keyword: string) =>
      headers.findIndex((h) => h.includes(keyword))

    const idxDate    = colIdx("日付")
    const idxName    = colIdx("氏名")
    const idxCount   = headers.findIndex((h) => h.includes("接客件数") && !h.includes("目標"))
    const idxTarget  = headers.findIndex((h) => h.includes("接客件数目標") || h.includes("目標"))

    if (idxName === -1 || idxCount === -1) {
      return {
        yearMonth: null,
        rows: [],
        error: "「氏名」または「接客件数」列が特定できませんでした。",
      }
    }

    // ── データ行を集計 ────────────────────────────────────────────────────
    // key: "氏名|YYYY-MM"
    const sumMap = new Map<string, { name: string; count: number; target: number; ym: string }>()
    let detectedYM: string | null = null

    for (let i = headerIdx + 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i])
      if (cols.length <= idxName) continue

      const name = cols[idxName]?.replace(/\s+/g, " ").trim()
      if (!name) continue

      // 月の検出（日付列があれば使う、なければ現在の月）
      let ym = detectedYM ?? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`
      if (idxDate >= 0 && cols[idxDate]) {
        const parsed = dateToYearMonth(cols[idxDate])
        if (parsed) {
          ym = parsed
          if (!detectedYM) detectedYM = parsed
        }
      }

      const count  = parseInt(cols[idxCount]  ?? "0", 10) || 0
      const target = idxTarget >= 0 ? (parseInt(cols[idxTarget] ?? "0", 10) || 0) : 0

      const key = `${name}|${ym}`
      if (!sumMap.has(key)) {
        sumMap.set(key, { name, count: 0, target: 0, ym })
      }
      const entry = sumMap.get(key)!
      entry.count  += count
      entry.target += target
    }

    if (sumMap.size === 0) {
      return { yearMonth: null, rows: [], error: "集計できるデータが見つかりませんでした。" }
    }

    // ── 結果を構築 ────────────────────────────────────────────────────────
    const rows: CustomerCountRow[] = Array.from(sumMap.values()).map(({ name, count, target, ym }) => {
      const matched = matchStaffByName(name)
      return {
        staffName: name,
        customerCount: count,
        customerTarget: target,
        yearMonth: ym,
        matchedStaffId: matched?.staffId ?? null,
        matchedStaffName: matched?.staffName ?? null,
      }
    })

    // 同スタッフ複数月が混在する場合、最多の月を代表月とする
    const ymFreq = new Map<string, number>()
    for (const r of rows) ymFreq.set(r.yearMonth, (ymFreq.get(r.yearMonth) ?? 0) + 1)
    const yearMonth = [...ymFreq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

    return { yearMonth, rows }
  } catch (e) {
    return {
      yearMonth: null,
      rows: [],
      error: e instanceof Error ? e.message : "CSV の読み込みに失敗しました",
    }
  }
}
