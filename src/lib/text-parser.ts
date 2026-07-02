/**
 * L-RPS3710 PDF からコピーしたテキストや、手入力テキストを解析して
 * スタッフ別の受注実績データを抽出するパーサー
 *
 * 対応フォーマット（いずれも可）：
 *   A) PDFビューアからコピペした生テキスト（| 区切り / 半角カタカナ混在）
 *   B) シンプルな CSV 形式：「スズキ, 750000, 800000」
 *   C) 年月だけ指定して手入力
 */

import { matchStaff, StaffSalesRow, PdfImportResult } from "./pdf-parser"

// ─── 半角カタカナ → 全角カタカナ ────────────────────────────────────────────
function toFullWidthKana(str: string): string {
  const HW: Record<string, string> = {
    "ｦ":"ヲ","ｧ":"ァ","ｨ":"ィ","ｩ":"ゥ","ｪ":"ェ","ｫ":"ォ","ｬ":"ャ","ｭ":"ュ","ｮ":"ョ",
    "ｯ":"ッ","ｰ":"ー","ｱ":"ア","ｲ":"イ","ｳ":"ウ","ｴ":"エ","ｵ":"オ","ｶ":"カ","ｷ":"キ",
    "ｸ":"ク","ｹ":"ケ","ｺ":"コ","ｻ":"サ","ｼ":"シ","ｽ":"ス","ｾ":"セ","ｿ":"ソ","ﾀ":"タ",
    "ﾁ":"チ","ﾂ":"ツ","ﾃ":"テ","ﾄ":"ト","ﾅ":"ナ","ﾆ":"ニ","ﾇ":"ヌ","ﾈ":"ネ","ﾉ":"ノ",
    "ﾊ":"ハ","ﾋ":"ヒ","ﾌ":"フ","ﾍ":"ヘ","ﾎ":"ホ","ﾏ":"マ","ﾐ":"ミ","ﾑ":"ム","ﾒ":"メ",
    "ﾓ":"モ","ﾔ":"ヤ","ﾕ":"ユ","ﾖ":"ヨ","ﾗ":"ラ","ﾘ":"リ","ﾙ":"ル","ﾚ":"レ","ﾛ":"ロ",
    "ﾜ":"ワ","ﾝ":"ン","ﾞ":"゛","ﾟ":"゜",
  }
  let result = ""
  for (let i = 0; i < str.length; i++) {
    const c = str[i]
    const next = str[i + 1]
    const fw = HW[c]
    if (fw) {
      if (next === "ﾞ") {
        const v: Record<string, string> = {
          "カ":"ガ","キ":"ギ","ク":"グ","ケ":"ゲ","コ":"ゴ","サ":"ザ","シ":"ジ","ス":"ズ",
          "セ":"ゼ","ソ":"ゾ","タ":"ダ","チ":"ヂ","ツ":"ヅ","テ":"デ","ト":"ド","ハ":"バ",
          "ヒ":"ビ","フ":"ブ","ヘ":"ベ","ホ":"ボ","ウ":"ヴ",
        }
        result += v[fw] ?? fw + "゛"; i++
      } else if (next === "ﾟ") {
        const p: Record<string, string> = { "ハ":"パ","ヒ":"ピ","フ":"プ","ヘ":"ペ","ホ":"ポ" }
        result += p[fw] ?? fw + "゜"; i++
      } else {
        result += fw
      }
    } else {
      result += c
    }
  }
  return result
}

const KATAKANA_RE = /^[ァ-ヺーｦ-ﾟ\s]+$/
const SEP_RE     = /^[\s|│]+$/
const NUM_RE     = /^[\d,]+$/

// ─── メイン ────────────────────────────────────────────────────────────────
export function parseTextInput(
  text: string,
  overrideYearMonth?: string   // ダイアログで手入力した年月
): PdfImportResult {
  const lines = text.split(/\r?\n/)

  // ── 年月の検出 ──────────────────────────────────────────────────────────
  let yearMonth: string | null = overrideYearMonth ?? null

  if (!yearMonth) {
    for (const line of lines) {
      // "26.06.01 〜" 形式
      const m1 = line.match(/(\d{2})\.(\d{2})\.\d{2}\s*[〜～~]/)
      if (m1) { yearMonth = `20${m1[1]}-${m1[2]}`; break }
      // "2026-06" / "2026年06月" 形式
      const m2 = line.match(/(\d{4})[年\-](\d{2})[月]?/)
      if (m2) { yearMonth = `${m2[1]}-${m2[2]}`; break }
    }
  }

  // ── スタッフ行の検出 ────────────────────────────────────────────────────
  const rows: StaffSalesRow[] = []
  const seenNames = new Set<string>()

  for (const line of lines) {
    // CSV 形式（「スズキ, 750000, 800000」）を優先チェック
    const csvMatch = line.match(/^([^\d,|][^,|]*),\s*([\d,]+)\s*,\s*([\d,]+)/)
    if (csvMatch) {
      const rawName = toFullWidthKana(csvMatch[1].trim())
      if (!seenNames.has(rawName)) {
        const actual = parseInt(csvMatch[2].replace(/,/g, ""), 10)
        const target = parseInt(csvMatch[3].replace(/,/g, ""), 10)
        if (actual > 0 || target > 0) {
          const matched = matchStaff(rawName)
          rows.push({
            rawName,
            actual,
            target,
            rate: target > 0 ? Math.round((actual / target) * 100) : 0,
            matchedStaffId: matched?.staffId ?? null,
            matchedStaffName: matched?.staffName ?? null,
          })
          seenNames.add(rawName)
        }
      }
      continue
    }

    // PDF コピペ形式: |・+・- などの罫線文字を空白に置換してから分割
    const tokens = line
      .replace(/[|│+\-─━]+/g, " ")
      .split(/\s+/)
      .filter(Boolean)

    const trimmed = tokens

    if (trimmed.length < 2) continue
    if (!KATAKANA_RE.test(trimmed[0])) continue

    // 氏名トークンを連結
    let nameCount = 1
    while (nameCount < trimmed.length && KATAKANA_RE.test(trimmed[nameCount])) nameCount++
    const rawName = toFullWidthKana(trimmed.slice(0, nameCount).join(" ")).trim()

    if (seenNames.has(rawName)) continue

    const rest = trimmed.slice(nameCount)
    const bigNums: number[] = []
    const pctNums: number[] = []

    for (const token of rest) {
      if (SEP_RE.test(token)) continue
      if (NUM_RE.test(token)) {
        const n = parseInt(token.replace(/,/g, ""), 10)
        if (n > 1000) bigNums.push(n)
      }
      const pct = token.match(/^(\d+\.\d{2})$/)
      if (pct) pctNums.push(parseFloat(pct[1]))
    }

    if (bigNums.length < 1) continue
    if (bigNums[0] > 50_000_000) continue // 店舗計を除外

    seenNames.add(rawName)
    const actual = bigNums[0]
    const target = bigNums[1] ?? 0
    const rate   = pctNums[pctNums.length - 1] ?? 0

    const matched = matchStaff(rawName)
    rows.push({
      rawName,
      actual,
      target,
      rate,
      matchedStaffId: matched?.staffId ?? null,
      matchedStaffName: matched?.staffName ?? null,
    })
  }

  return { yearMonth, rows }
}
