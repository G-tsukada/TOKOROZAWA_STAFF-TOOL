/**
 * L-RPS3710「組織・担当者別 受注順位グラフ」PDF から実績データを抽出するパーサー
 *
 * PDF フォーマット（各スタッフ 2 行構成）:
 *   行1: [カタカナ氏名]  [順位]  [受注実績]  [構成比%]  [受注目標]  [構成比%]  [達成率%]
 *   行2: [スタッフコード] [順位]  [粗利実績]  [構成比%]  [粗利目標]  [構成比%]  [達成率%]
 *
 * → 行1 の数値のみ使用（受注実績・受注目標・達成率）
 */

export interface StaffSalesRow {
  rawName: string         // PDF 上のカタカナ氏名
  actual: number          // 受注実績（円）
  target: number          // 受注目標（円）
  rate: number            // 達成率（%）
  matchedStaffId: string | null
  matchedStaffName: string | null
}

export interface PdfImportResult {
  yearMonth: string | null   // "YYYY-MM" 形式（例: "2026-06"）
  rows: StaffSalesRow[]
  error?: string
}

// ─── カタカナ姓（PDF 表記）→ staffId マッピング ─────────────────────────────
// PDF ではスタッフ名が省略されたカタカナで記載される
const KANA_MAP: Array<{ kana: string; staffId: string; staffName: string }> = [
  { kana: "テシガハラ", staffId: "s1",    staffName: "勅使川原 純" },
  { kana: "スズキ",     staffId: "s2",    staffName: "鈴木 さおり" },
  { kana: "ヨシカワ",   staffId: "s3",    staffName: "吉川 夏子" },
  { kana: "ミナミサワ", staffId: "s4",    staffName: "南澤 みづき" },
  { kana: "スベ",       staffId: "s5",    staffName: "須部 馨代" },
  { kana: "タカハシ",   staffId: "s6",    staffName: "高橋 佳愛" },
  { kana: "サトウ",     staffId: "s7",    staffName: "佐藤 みわ" },
  { kana: "イマイズミ", staffId: "s8",    staffName: "今泉 美恵子" },
  { kana: "モリタ",     staffId: "s9",    staffName: "森田 悦子" },
  { kana: "キクチ",     staffId: "s10",   staffName: "菊地 千尋" },
  { kana: "ツカダ",     staffId: "mgr1",  staffName: "塚田 岳人" },
]

// 半角カタカナ → 全角カタカナ 変換
function toFullWidthKana(str: string): string {
  // 半角カタカナの濁点・半濁点は前の文字と結合する
  const HW_KANA: Record<string, string> = {
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
    const fw = HW_KANA[c]
    if (fw) {
      if (next === "ﾞ") {
        const voiced: Record<string, string> = {
          "カ":"ガ","キ":"ギ","ク":"グ","ケ":"ゲ","コ":"ゴ","サ":"ザ","シ":"ジ","ス":"ズ",
          "セ":"ゼ","ソ":"ゾ","タ":"ダ","チ":"ヂ","ツ":"ヅ","テ":"デ","ト":"ド","ハ":"バ",
          "ヒ":"ビ","フ":"ブ","ヘ":"ベ","ホ":"ボ","ウ":"ヴ",
        }
        result += voiced[fw] ?? fw + "゛"
        i++
      } else if (next === "ﾟ") {
        const pvoiced: Record<string, string> = { "ハ":"パ","ヒ":"ピ","フ":"プ","ヘ":"ペ","ホ":"ポ" }
        result += pvoiced[fw] ?? fw + "゜"
        i++
      } else {
        result += fw
      }
    } else {
      result += c
    }
  }
  return result
}

export function matchStaff(rawName: string): { staffId: string; staffName: string } | null {
  // 半角→全角変換後にスペース除去して照合
  const normalized = toFullWidthKana(rawName).replace(/\s+/g, "")
  for (const entry of KANA_MAP) {
    if (normalized.startsWith(entry.kana) || normalized.includes(entry.kana)) {
      return { staffId: entry.staffId, staffName: entry.staffName }
    }
  }
  return null
}

// ─── PDF パース本体 ──────────────────────────────────────────────────────────
export async function parseSalesPdf(file: File): Promise<PdfImportResult> {
  try {
    // SSR を避けるためダイナミックインポート
    const pdfjsLib = await import("pdfjs-dist")
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"

    const buffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({
      data: buffer,
      cMapUrl: "/cmaps/",
      cMapPacked: true,
    }).promise

    // 全ページのテキストアイテムを (x, y, text) で収集
    type Item = { x: number; y: number; str: string }
    const allItems: Item[] = []

    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p)
      const tc = await page.getTextContent()
      for (const item of tc.items) {
        if (!("str" in item) || !item.str.trim()) continue
        const t = (item as { transform: number[] }).transform
        allItems.push({ x: t[4], y: t[5], str: item.str.trim() })
      }
    }

    // ── y座標でグループ化（8pt 単位で丸めることで同一行を束ねる） ──────────
    const rowMap = new Map<number, Item[]>()
    for (const item of allItems) {
      const yKey = Math.round(item.y / 8) * 8
      if (!rowMap.has(yKey)) rowMap.set(yKey, [])
      rowMap.get(yKey)!.push(item)
    }

    // y 降順（PDF 座標系は下が小さい）、行内は x 昇順
    const sortedRows = Array.from(rowMap.entries())
      .sort(([a], [b]) => b - a)
      .map(([, items]) => items.sort((a, b) => a.x - b.x).map((i) => i.str))

    // ── 実績期間の抽出 ──────────────────────────────────────────────────────
    const fullText = sortedRows.map((r) => r.join(" ")).join("\n")
    let yearMonth: string | null = null
    const periodMatch = fullText.match(/(\d{2})\.(\d{2})\.\d{2}\s*[〜～~]/)
    if (periodMatch) {
      yearMonth = `20${periodMatch[1]}-${periodMatch[2]}`
    }

    // ── スタッフ行の抽出 ────────────────────────────────────────────────────
    // 判定条件: 先頭の「| 」セパレータをスキップした後のトークンがカタカナ
    // ※ 名前トークン内にスペースが含まれる場合もある（例: "ﾖｼｶﾜ ﾅ"）
    const KATAKANA_RE = /^[ァ-ヺーｦ-ﾟ\s]+$/
    const SEP_RE = /^[\s|│]+$/
    const NUM_RE = /^[\d,]+$/

    const rows: StaffSalesRow[] = []
    const seenNames = new Set<string>()

    for (const row of sortedRows) {
      // 先頭のセパレータトークン（" | " など）をスキップ
      let startIdx = 0
      while (startIdx < row.length && SEP_RE.test(row[startIdx])) {
        startIdx++
      }
      const trimmedRow = row.slice(startIdx)

      if (trimmedRow.length < 2) continue

      // 先頭トークンがカタカナ（スペース混在可）かどうかで「スタッフ名行」を判定
      const firstKana = KATAKANA_RE.test(trimmedRow[0])
      if (!firstKana) continue

      // 氏名部分を連結（カタカナトークンが続く限り）
      let nameTokenCount = 1
      while (nameTokenCount < trimmedRow.length && KATAKANA_RE.test(trimmedRow[nameTokenCount])) {
        nameTokenCount++
      }
      const rawName = toFullWidthKana(trimmedRow.slice(0, nameTokenCount).join(" ")).trim()

      // 同じ名前はスキップ（粗利行 or 重複）
      if (seenNames.has(rawName)) continue

      // 残りのトークンから数値を抽出
      const rest = trimmedRow.slice(nameTokenCount)
      const bigNums: number[] = []
      const pctNums: number[] = []

      for (const token of rest) {
        if (NUM_RE.test(token)) {
          const n = parseInt(token.replace(/,/g, ""), 10)
          if (n > 1000) bigNums.push(n)   // 実績・目標（円）
        }
        const pctMatch = token.match(/^(\d+\.\d{2})$/)
        if (pctMatch) pctNums.push(parseFloat(pctMatch[1]))
      }

      if (bigNums.length < 1) continue

      // 受注実績 = bigNums[0]、受注目標 = bigNums[1]
      // 達成率 = pctNums のうち最後の値（構成比より後）
      const actual = bigNums[0]
      const target = bigNums[1] ?? 0
      const rate = pctNums[pctNums.length - 1] ?? 0

      // 合計行（「店舗計」など大きすぎる値）は除外
      if (actual > 50_000_000) continue

      seenNames.add(rawName)

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
  } catch (e) {
    return {
      yearMonth: null,
      rows: [],
      error: e instanceof Error ? e.message : "PDF の読み込みに失敗しました",
    }
  }
}
