"use client"

import { useState, useRef, useCallback } from "react"
import { useAppStore } from "@/lib/store"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { STATUS_LABEL, STATUS_COLOR, TaskStatus, PerformanceRecord, CategoryMetricItem, SELECTABLE_STATUSES, Task, Staff } from "@/lib/mock-data"
import { parseSalesPdf, StaffSalesRow } from "@/lib/pdf-parser"
import { parseCustomerCsv, CustomerCountRow } from "@/lib/csv-parser"
import { parseTextInput } from "@/lib/text-parser"
import { cn } from "@/lib/utils"
import { Lock, ChevronDown, Pencil, Plus, Trash2, Check, X, Upload, FileText, AlertCircle, ClipboardPaste, Eraser } from "lucide-react"

const MANAGER_PIN = "1234"

// ---- 型 ----
type CategoryMetricRow = { key: string; budget: string; actual: string }

// ---- メインコンポーネント ----
export function PaneProgress() {
  const {
    selectedStaffId, selectedMonth, tasks, performance,
    staff, updateTask, updateAdvice, isManagerMode, setManagerMode,
    upsertPerformance, setSelectedMonth, clearStaffData,
  } = useAppStore()

  const [pinInput, setPinInput] = useState("")
  const [pinError, setPinError] = useState(false)
  const [pinDialogOpen, setPinDialogOpen] = useState(false)
  const [editPerfOpen, setEditPerfOpen] = useState(false)
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const [isClearing, setIsClearing] = useState(false)

  // ── テキスト貼り付けダイアログ ──
  const [pasteDialogOpen, setPasteDialogOpen] = useState(false)
  const [pasteText, setPasteText] = useState("")
  const [pasteYearMonth, setPasteYearMonth] = useState("")

  // ── ファイルインポート（PDF / CSV 共通） ──
  type ImportFileType = "pdf" | "csv"
  const [isDragOver, setIsDragOver] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [importFileType, setImportFileType] = useState<ImportFileType | null>(null)
  const [importYearMonth, setImportYearMonth] = useState<string | null>(null)
  const [manualYearMonth, setManualYearMonth] = useState("")
  const [importError, setImportError] = useState<string | null>(null)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  // PDF 用
  const [pdfRows, setPdfRows] = useState<StaffSalesRow[] | null>(null)
  const [selectedPdfRows, setSelectedPdfRows] = useState<Set<string>>(new Set())
  // CSV 用
  const [csvRows, setCsvRows] = useState<CustomerCountRow[] | null>(null)
  const [selectedCsvRows, setSelectedCsvRows] = useState<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)

  const openImportDialog = (type: ImportFileType, ym: string | null, error?: string) => {
    setImportFileType(type)
    setImportYearMonth(ym)
    setManualYearMonth(ym ?? selectedMonth)
    setImportError(error ?? null)
    setImportDialogOpen(true)
  }

  const handlePdfFile = useCallback(async (file: File) => {
    setIsParsing(true)
    const result = await parseSalesPdf(file)
    setIsParsing(false)
    if (result.error) {
      openImportDialog("pdf", null, result.error)
      return
    }
    setPdfRows(result.rows)
    setSelectedPdfRows(
      new Set(result.rows.filter((r) => r.matchedStaffId !== null).map((r) => r.rawName))
    )
    openImportDialog("pdf", result.yearMonth)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCsvFile = useCallback(async (file: File) => {
    setIsParsing(true)
    const result = await parseCustomerCsv(file)
    setIsParsing(false)
    if (result.error) {
      openImportDialog("csv", null, result.error)
      return
    }
    setCsvRows(result.rows)
    setSelectedCsvRows(
      new Set(result.rows.filter((r) => r.matchedStaffId !== null).map((r) => r.staffName))
    )
    openImportDialog("csv", result.yearMonth)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFile = useCallback(
    (file: File) => {
      const name = file.name.toLowerCase()
      if (name.endsWith(".pdf")) handlePdfFile(file)
      else if (name.endsWith(".csv")) handleCsvFile(file)
      else {
        openImportDialog("pdf", null, "PDF または CSV ファイルをドロップしてください")
      }
    },
    [handlePdfFile, handleCsvFile]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  // PDF 適用：受注実績・目標を登録（接客件数は既存値を保持）
  const [isApplying, setIsApplying] = useState(false)
  const handlePdfApply = async () => {
    const ym = importYearMonth ?? manualYearMonth
    if (!pdfRows || !ym) return
    setIsApplying(true)
    try {
      await Promise.all(
        pdfRows
          .filter((row) => selectedPdfRows.has(row.rawName) && row.matchedStaffId)
          .map((row) => {
            const existing = performance.find(
              (p) => p.staffId === row.matchedStaffId && p.yearMonth === ym
            )
            return upsertPerformance({
              staffId: row.matchedStaffId!,
              yearMonth: ym,
              sales: row.actual,
              target: row.target,
              customerCount: existing?.customerCount ?? 0,
              customerTarget: existing?.customerTarget ?? 0,
              categoryMetrics: existing?.categoryMetrics ?? {},
            })
          })
      )
      // 表示月をインポート月に切り替え（内部で loadMonthData が走り Pane3 に反映される）
      setSelectedMonth(ym)
    } catch (e) {
      console.error("PDF apply failed:", e)
    } finally {
      setIsApplying(false)
      setImportDialogOpen(false)
      setPdfRows(null)
    }
  }

  // CSV 適用：接客件数・目標を登録（売上は既存値を保持）
  const handleCsvApply = () => {
    if (!csvRows || !importYearMonth) return
    for (const row of csvRows) {
      if (!selectedCsvRows.has(row.staffName) || !row.matchedStaffId) continue
      const existing = performance.find(
        (p) => p.staffId === row.matchedStaffId && p.yearMonth === importYearMonth
      )
      upsertPerformance({
        staffId: row.matchedStaffId,
        yearMonth: importYearMonth,
        sales: existing?.sales ?? 0,
        target: existing?.target ?? 0,
        customerCount: row.customerCount,
        customerTarget: row.customerTarget,
        categoryMetrics: existing?.categoryMetrics ?? {},
      })
    }
    setImportDialogOpen(false)
    setCsvRows(null)
  }

  // テキスト貼り付けを解析して PDF 確認ダイアログを流用
  const handlePasteSubmit = () => {
    const result = parseTextInput(pasteText, pasteYearMonth || undefined)
    setPasteDialogOpen(false)
    setPasteText("")
    setPasteYearMonth("")
    if (result.rows.length === 0) {
      openImportDialog("pdf", result.yearMonth, "スタッフ名が検出できませんでした。形式を確認してください。")
      return
    }
    setPdfRows(result.rows)
    setSelectedPdfRows(
      new Set(result.rows.filter((r) => r.matchedStaffId !== null).map((r) => r.rawName))
    )
    openImportDialog("pdf", result.yearMonth)
  }

  const selectedStaff = staff.find((s) => s.id === selectedStaffId)
  const filteredTasks = tasks.filter(
    (t) => t.staffId === selectedStaffId && t.yearMonth === selectedMonth
  )
  const perf = performance.find(
    (p) => p.staffId === selectedStaffId && p.yearMonth === selectedMonth
  )

  // ---- PIN認証 ----
  const openAdviceEdit = () => {
    if (isManagerMode) return
    setPinDialogOpen(true)
  }

  const handlePinSubmit = () => {
    if (pinInput === MANAGER_PIN) {
      setManagerMode(true)
      setPinDialogOpen(false)
      setPinInput("")
      setPinError(false)
    } else {
      setPinError(true)
    }
  }

  const handleClearStaffData = async () => {
    if (!selectedStaffId) return
    setIsClearing(true)
    try {
      await clearStaffData(selectedStaffId, selectedMonth)
    } finally {
      setIsClearing(false)
      setClearConfirmOpen(false)
    }
  }

  if (!selectedStaffId) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        ← スタッフを選択してください
      </div>
    )
  }

  const isManager = selectedStaffId === "mgr1"

  const achievementRate = perf && perf.target ? Math.round((perf.sales / perf.target) * 100) : null
  const salesDiff = perf ? perf.sales - perf.target : null
  const customerRate = perf && perf.customerTarget ? Math.round((perf.customerCount / perf.customerTarget) * 100) : null
  const customerDiff = perf ? perf.customerCount - perf.customerTarget : null

  return (
    <>
      <ScrollArea className="h-full">
        <div className="p-3 space-y-4">

          {/* ── PDF ドロップゾーン ── */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "rounded-lg border-2 border-dashed px-3 py-2.5 text-center cursor-pointer transition-colors select-none",
              isDragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/40"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
                e.target.value = ""
              }}
            />
            {isParsing ? (
              <p className="text-xs text-muted-foreground animate-pulse">ファイルを解析中...</p>
            ) : (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Upload className="h-3.5 w-3.5 shrink-0" />
                <div className="text-left">
                  <p className="text-[11px] font-medium">PDF / CSV をここにドロップ</p>
                  <p className="text-[10px] opacity-70">
                    PDF → 受注実績（全員一括）　CSV → 接客件数（全員一括）
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── テキスト貼り付けボタン ── */}
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs gap-1.5 h-7"
            onClick={() => setPasteDialogOpen(true)}
          >
            <ClipboardPaste className="h-3.5 w-3.5" />
            テキスト貼り付けで取込
          </Button>

          {/* ── 店長ビュー：ガントチャート ── */}
          {isManager && (
            <GanttSection yearMonth={selectedMonth} allTasks={tasks} allStaff={staff} />
          )}

          {/* ── 通常スタッフビュー ── */}
          {!isManager && <><section>
            <div className="flex items-center justify-between mb-2">
              <SectionLabel className="text-performance">実績サマリー — {selectedStaff?.name}</SectionLabel>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                onClick={() => setEditPerfOpen(true)}
              >
                <Pencil className="h-3 w-3" />
                手動入力
              </Button>
            </div>

            {perf ? (
              <div className="rounded-lg border border-l-2 border-l-performance bg-card p-3 space-y-3">

                {/* 個人実績 */}
                <div>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <p className="text-[9px] font-light text-muted-foreground uppercase tracking-[0.15em]">個人実績</p>
                    <p className="text-[9px] font-light text-muted-foreground">単位：千円</p>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 text-center">
                    <Metric label="予算" value={formatSen(perf.target)} />
                    <Metric label="実績" value={formatSen(perf.sales)} />
                    <Metric
                      label="達成率"
                      value={achievementRate !== null ? `${achievementRate}%` : "—"}
                      highlight={achievementRate !== null && achievementRate >= 100}
                      warn={achievementRate !== null && achievementRate < 80}
                    />
                    <Metric
                      label="差異"
                      value={salesDiff !== null ? formatSenDiff(salesDiff) : "—"}
                      highlight={salesDiff !== null && salesDiff >= 0}
                      warn={salesDiff !== null && salesDiff < 0}
                    />
                  </div>
                </div>

                <Separator />

                {/* 接客件数 */}
                <div>
                  <p className="text-[9px] font-light text-muted-foreground uppercase tracking-[0.15em] mb-1.5">接客件数</p>
                  <div className="grid grid-cols-4 gap-1.5 text-center">
                    <Metric label="予算" value={`${perf.customerTarget}件`} />
                    <Metric label="実績" value={`${perf.customerCount}件`} />
                    <Metric
                      label="達成率"
                      value={customerRate !== null ? `${customerRate}%` : "—"}
                      highlight={customerRate !== null && customerRate >= 100}
                      warn={customerRate !== null && customerRate < 80}
                    />
                    <Metric
                      label="差異"
                      value={customerDiff !== null ? formatCountDiff(customerDiff) : "—"}
                      highlight={customerDiff !== null && customerDiff >= 0}
                      warn={customerDiff !== null && customerDiff < 0}
                    />
                  </div>
                </div>

                {/* カテゴリ実績 */}
                {Object.keys(perf.categoryMetrics).length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="flex items-baseline justify-between mb-2">
                        <p className="text-[9px] font-light text-muted-foreground uppercase tracking-[0.15em]">カテゴリ実績</p>
                        <p className="text-[9px] font-light text-muted-foreground">単位：千円</p>
                      </div>
                      <div className="space-y-3">
                        {Object.entries(perf.categoryMetrics).map(([k, item]) => {
                          const rate = item.budget ? Math.round((item.actual / item.budget) * 100) : null
                          const diff = item.actual - item.budget
                          return (
                            <div key={k}>
                              <p className="text-[9px] font-light text-muted-foreground tracking-[0.1em] mb-1">{k}</p>
                              <div className="grid grid-cols-4 gap-1.5 text-center">
                                <Metric label="予算" value={formatSen(item.budget)} />
                                <Metric label="実績" value={formatSen(item.actual)} />
                                <Metric
                                  label="達成率"
                                  value={rate !== null ? `${rate}%` : "—"}
                                  highlight={rate !== null && rate >= 100}
                                  warn={rate !== null && rate < 80}
                                />
                                <Metric
                                  label="差異"
                                  value={formatSenDiff(diff)}
                                  highlight={diff >= 0}
                                  warn={diff < 0}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-center space-y-2">
                <p className="text-sm text-muted-foreground">実績データなし</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setEditPerfOpen(true)}
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  手動入力
                </Button>
              </div>
            )}
          </section>

          {/* ── タスク進捗 ── */}
          <section>
            <SectionLabel className="mb-2">タスク進捗</SectionLabel>
            <div className="space-y-3">
              {filteredTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">タスクがありません</p>
              ) : (
                filteredTasks.map((task) => (
                  <div key={task.id} className="rounded-lg border bg-card p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-normal leading-snug">{task.title}</p>
                        {task.dueDate && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            完了予定: {task.dueDate}
                          </p>
                        )}
                      </div>
                      <StatusSelector
                        value={task.status as TaskStatus}
                        onChange={(s) => updateTask(task.id, { status: s })}
                      />
                    </div>

                    <Textarea
                      placeholder="メモ..."
                      value={task.memo}
                      onChange={(e) => updateTask(task.id, { memo: e.target.value })}
                      className="text-xs min-h-[52px] resize-none"
                    />

                    {/* 停滞タスク：店長コメント欄 */}
                    {task.status === "stalled" && (
                      <div className="border rounded-md p-2.5 bg-amber-50 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-semibold text-amber-700 flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            店長コメント
                          </p>
                          {!isManagerMode && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-[10px] px-2 bg-white"
                              onClick={openAdviceEdit}
                            >
                              編集（PIN）
                            </Button>
                          )}
                        </div>
                        {isManagerMode ? (
                          <Textarea
                            placeholder="助言を入力..."
                            value={task.advice}
                            onChange={(e) => updateAdvice(task.id, e.target.value)}
                            className="text-xs min-h-[56px] resize-none bg-white"
                          />
                        ) : (
                          <p className="text-xs text-amber-900 whitespace-pre-wrap min-h-[32px]">
                            {task.advice || "（コメントなし）"}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {isManagerMode && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs mt-3"
                onClick={() => setManagerMode(false)}
              >
                マネージャーモードを終了
              </Button>
            )}
          </section>

          {/* ── 一括消去ボタン（右下） ── */}
          <div className="flex justify-end pt-2 pb-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[11px] gap-1.5 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10"
              onClick={() => setClearConfirmOpen(true)}
            >
              <Eraser className="h-3.5 w-3.5" />
              {selectedMonth} のデータを消去
            </Button>
          </div>
          </>}
        </div>
      </ScrollArea>

      {/* ── 一括消去 確認ダイアログ ── */}
      <Dialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Eraser className="h-4 w-4" />
              データを消去しますか？
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{selectedStaff?.name}</span> の{" "}
              <span className="font-semibold text-foreground">{selectedMonth}</span>{" "}
              の実績・タスクをすべて削除します。この操作は元に戻せません。
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setClearConfirmOpen(false)}
              >
                キャンセル
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="flex-1"
                disabled={isClearing}
                onClick={handleClearStaffData}
              >
                {isClearing ? (
                  <span className="animate-pulse">消去中...</span>
                ) : (
                  <><Trash2 className="h-3.5 w-3.5 mr-1" />消去する</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── PIN入力ダイアログ ── */}
      <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>マネージャー確認</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">PINを入力してください</p>
            <Input
              type="password"
              placeholder="PIN（4桁）"
              value={pinInput}
              onChange={(e) => { setPinInput(e.target.value); setPinError(false) }}
              onKeyDown={(e) => e.key === "Enter" && handlePinSubmit()}
              maxLength={4}
            />
            {pinError && <p className="text-xs text-destructive">PINが違います</p>}
            <Button className="w-full" onClick={handlePinSubmit}>確認</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── 実績手動入力ダイアログ ── */}
      {selectedStaffId && (
        <PerfEditDialog
          open={editPerfOpen}
          onOpenChange={setEditPerfOpen}
          current={perf}
          staffId={selectedStaffId}
          yearMonth={selectedMonth}
          onSave={upsertPerformance}
        />
      )}

      {/* ── テキスト貼り付けダイアログ ── */}
      <Dialog open={pasteDialogOpen} onOpenChange={setPasteDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardPaste className="h-4 w-4" />
              テキスト貼り付けで取込（受注実績）
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-1.5">
              <p className="font-medium text-foreground">使い方</p>
              <p>① PDFをビューア（Acrobat / Edge等）で開き Ctrl+A → Ctrl+C でコピー</p>
              <p>② 下のテキストエリアに貼り付け（Ctrl+V）</p>
              <p className="pt-1 font-medium text-foreground">または シンプル形式で手入力：</p>
              <pre className="bg-background rounded p-2 text-[10px]">{`スズキ, 750000, 800000\nタカハシ, 1200000, 1500000`}</pre>
              <p className="text-[10px]">（名前, 実績円, 目標円）</p>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">
                対象年月（自動検出されない場合に入力）
              </label>
              <Input
                className="mt-1 h-8 text-sm"
                placeholder="例: 2026-06"
                value={pasteYearMonth}
                onChange={(e) => setPasteYearMonth(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground">テキスト</label>
              <Textarea
                className="mt-1 text-xs min-h-[180px] font-mono resize-y"
                placeholder="PDFからコピーしたテキスト、またはシンプル形式を貼り付けてください"
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setPasteDialogOpen(false)}>
                キャンセル
              </Button>
              <Button size="sm" className="flex-1" disabled={!pasteText.trim()} onClick={handlePasteSubmit}>
                <Check className="h-3.5 w-3.5 mr-1" />
                解析する
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── インポート確認ダイアログ（PDF / CSV 共通） ── */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {importFileType === "csv" ? "CSV 取込確認（接客件数）" : "PDF 取込確認（受注実績）"}
            </DialogTitle>
          </DialogHeader>

          {importError ? (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>{importError}</p>
            </div>
          ) : importFileType === "pdf" && pdfRows ? (
            /* ── PDF（受注実績）確認 ── */
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="text-sm text-muted-foreground">
                  対象月:
                </span>
                {importYearMonth ? (
                  <span className="text-sm font-medium text-foreground">{importYearMonth}</span>
                ) : (
                  <Input
                    className="h-7 w-32 text-sm"
                    placeholder="例: 2026-06"
                    value={manualYearMonth}
                    onChange={(e) => setManualYearMonth(e.target.value)}
                  />
                )}
                <span className="text-sm text-muted-foreground">
                  検出: <span className="font-medium text-foreground">{pdfRows.length} 件</span>
                  　/ マッチ: <span className="font-medium text-green-600">
                    {pdfRows.filter((r) => r.matchedStaffId).length} 件
                  </span>
                </span>
              </div>
              {!importYearMonth && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded px-2 py-1.5">
                  対象月を PDF から読み取れませんでした。適用する年月を入力してください。
                </p>
              )}
              {(importYearMonth ?? manualYearMonth) && (importYearMonth ?? manualYearMonth) !== selectedMonth && (
                <p className="text-xs text-blue-600 bg-blue-50 rounded px-2 py-1.5">
                  適用後、表示月が <span className="font-semibold">{importYearMonth ?? manualYearMonth}</span> に切り替わります。
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                受注実績・目標を登録します。接客件数の既存データは保持されます。
              </p>
              <div className="space-y-1.5">
                {pdfRows.map((row) => {
                  const checked = selectedPdfRows.has(row.rawName)
                  const matched = row.matchedStaffId !== null
                  return (
                    <label
                      key={row.rawName}
                      className={cn(
                        "flex items-center gap-3 rounded-md border px-3 py-2 cursor-pointer transition-colors",
                        checked && matched ? "bg-primary/5 border-primary/30" : "hover:bg-muted/40",
                        !matched && "opacity-50"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked && matched}
                        disabled={!matched}
                        onChange={() =>
                          setSelectedPdfRows((prev) => {
                            const next = new Set(prev)
                            next.has(row.rawName) ? next.delete(row.rawName) : next.add(row.rawName)
                            return next
                          })
                        }
                        className="h-3.5 w-3.5 accent-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{row.matchedStaffName ?? row.rawName}</span>
                          {!matched && <Badge variant="secondary" className="text-[9px] px-1 py-0">未マッチ</Badge>}
                        </div>
                        <p className="text-[10px] text-muted-foreground">PDF: {row.rawName}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-medium">{row.actual.toLocaleString()}円</p>
                        <p className="text-[10px] text-muted-foreground">
                          目標 {row.target.toLocaleString()}円 / {row.rate}%
                        </p>
                      </div>
                    </label>
                  )
                })}
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setImportDialogOpen(false)}>
                  キャンセル
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={selectedPdfRows.size === 0 || !(importYearMonth ?? manualYearMonth) || isApplying}
                  onClick={handlePdfApply}
                >
                  {isApplying ? (
                    <span className="animate-pulse">保存中...</span>
                  ) : (
                    <><Check className="h-3.5 w-3.5 mr-1" />{selectedPdfRows.size} 件を適用</>
                  )}
                </Button>
              </div>
            </div>
          ) : importFileType === "csv" && csvRows ? (
            /* ── CSV（接客件数）確認 ── */
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                対象月: <span className="font-medium text-foreground">{importYearMonth ?? "不明"}</span>
                　/ 検出: <span className="font-medium text-foreground">{csvRows.length} 件</span>
                　/ マッチ: <span className="font-medium text-green-600">
                  {csvRows.filter((r) => r.matchedStaffId).length} 件
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                月次接客件数・目標を登録します。売上の既存データは保持されます。
              </p>
              <div className="space-y-1.5">
                {csvRows.map((row) => {
                  const checked = selectedCsvRows.has(row.staffName)
                  const matched = row.matchedStaffId !== null
                  return (
                    <label
                      key={row.staffName}
                      className={cn(
                        "flex items-center gap-3 rounded-md border px-3 py-2 cursor-pointer transition-colors",
                        checked && matched ? "bg-primary/5 border-primary/30" : "hover:bg-muted/40",
                        !matched && "opacity-50"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked && matched}
                        disabled={!matched}
                        onChange={() =>
                          setSelectedCsvRows((prev) => {
                            const next = new Set(prev)
                            next.has(row.staffName) ? next.delete(row.staffName) : next.add(row.staffName)
                            return next
                          })
                        }
                        className="h-3.5 w-3.5 accent-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{row.matchedStaffName ?? row.staffName}</span>
                          {!matched && <Badge variant="secondary" className="text-[9px] px-1 py-0">未マッチ</Badge>}
                        </div>
                        <p className="text-[10px] text-muted-foreground">CSV: {row.staffName}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-medium">{row.customerCount} 件</p>
                        <p className="text-[10px] text-muted-foreground">
                          目標 {row.customerTarget} 件
                        </p>
                      </div>
                    </label>
                  )
                })}
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setImportDialogOpen(false)}>
                  キャンセル
                </Button>
                <Button size="sm" className="flex-1" disabled={selectedCsvRows.size === 0} onClick={handleCsvApply}>
                  <Check className="h-3.5 w-3.5 mr-1" />
                  {selectedCsvRows.size} 件を適用
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}

// ── 実績入力ダイアログ ──────────────────────────────────
function PerfEditDialog({
  open, onOpenChange, current, staffId, yearMonth, onSave,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  current: PerformanceRecord | undefined
  staffId: string
  yearMonth: string
  onSave: (r: PerformanceRecord) => void
}) {
  const [sales, setSales] = useState(String(current?.sales ?? ""))
  const [target, setTarget] = useState(String(current?.target ?? ""))
  const [customerCount, setCustomerCount] = useState(String(current?.customerCount ?? ""))
  const [customerTarget, setCustomerTarget] = useState(String(current?.customerTarget ?? ""))
  const [catRows, setCatRows] = useState<CategoryMetricRow[]>(
    current
      ? Object.entries(current.categoryMetrics).map(([key, item]) => ({
          key,
          budget: String((item as CategoryMetricItem).budget),
          actual: String((item as CategoryMetricItem).actual),
        }))
      : []
  )

  const handleOpen = (v: boolean) => {
    if (v && current) {
      setSales(String(current.sales))
      setTarget(String(current.target))
      setCustomerCount(String(current.customerCount))
      setCustomerTarget(String(current.customerTarget))
      setCatRows(
        Object.entries(current.categoryMetrics).map(([key, item]) => ({
          key,
          budget: String((item as CategoryMetricItem).budget),
          actual: String((item as CategoryMetricItem).actual),
        }))
      )
    }
    onOpenChange(v)
  }

  const addRow = () => setCatRows((r) => [...r, { key: "", budget: "", actual: "" }])
  const removeRow = (i: number) => setCatRows((r) => r.filter((_, idx) => idx !== i))
  const updateRow = (i: number, field: "key" | "budget" | "actual", val: string) =>
    setCatRows((r) => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row))

  const handleSave = () => {
    const categoryMetrics: Record<string, CategoryMetricItem> = {}
    catRows.forEach(({ key, budget, actual }) => {
      if (key.trim()) {
        categoryMetrics[key.trim()] = {
          budget: parseFloat(budget) || 0,
          actual: parseFloat(actual) || 0,
        }
      }
    })

    onSave({
      staffId,
      yearMonth,
      sales: parseFloat(sales) || 0,
      target: parseFloat(target) || 0,
      customerCount: parseInt(customerCount) || 0,
      customerTarget: parseInt(customerTarget) || 0,
      categoryMetrics,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-sm max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>実績を入力</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* 個人実績 */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <p className="text-[9px] font-light text-muted-foreground uppercase tracking-[0.15em]">
                個人実績
              </p>
              <p className="text-[9px] font-light text-muted-foreground">単位：円</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">予算（円）</label>
                <Input
                  className="mt-1 h-8 text-sm"
                  placeholder="例: 1500000"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">実績（円）</label>
                <Input
                  className="mt-1 h-8 text-sm"
                  placeholder="例: 1200000"
                  value={sales}
                  onChange={(e) => setSales(e.target.value)}
                />
              </div>
            </div>
            {sales && target && parseFloat(target) > 0 && (
              <p className="text-xs text-muted-foreground">
                達成率: <span className="font-medium text-foreground">
                  {Math.round((parseFloat(sales) / parseFloat(target)) * 100)}%
                </span>
                　差異: <span className="font-medium text-foreground">
                  {Math.round((parseFloat(sales) - parseFloat(target)) / 1000).toLocaleString()}千円
                </span>
              </p>
            )}
          </div>

          <Separator />

          {/* 接客件数 */}
          <div className="space-y-2">
            <p className="text-[9px] font-light text-muted-foreground uppercase tracking-[0.15em]">
              接客件数
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">予算（件）</label>
                <Input
                  className="mt-1 h-8 text-sm"
                  placeholder="例: 45"
                  value={customerTarget}
                  onChange={(e) => setCustomerTarget(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">実績（件）</label>
                <Input
                  className="mt-1 h-8 text-sm"
                  placeholder="例: 38"
                  value={customerCount}
                  onChange={(e) => setCustomerCount(e.target.value)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* カテゴリ実績 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-light text-muted-foreground uppercase tracking-[0.15em]">
                  カテゴリ実績
                </p>
                <p className="text-[9px] font-light text-muted-foreground">単位：円</p>
              </div>
              <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={addRow}>
                <Plus className="h-3 w-3" /> 項目追加
              </Button>
            </div>
            {catRows.length === 0 && (
              <p className="text-xs text-muted-foreground">
                「項目追加」でカテゴリ別売上などを入力できます
              </p>
            )}
            <div className="space-y-2">
              {catRows.map((row, i) => {
                const rate = row.budget && row.actual
                  ? Math.round((parseFloat(row.actual) / parseFloat(row.budget)) * 100)
                  : null
                return (
                  <div key={i} className="border rounded-md p-2 space-y-1.5 bg-muted/30">
                    <div className="flex items-center gap-1.5">
                      <Input
                        className="h-7 text-xs flex-1"
                        placeholder="項目名（例: VP売上）"
                        value={row.key}
                        onChange={(e) => updateRow(i, "key", e.target.value)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeRow(i)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="text-[10px] text-muted-foreground">予算（円）</label>
                        <Input
                          className="h-7 text-xs mt-0.5"
                          placeholder="例: 1500000"
                          value={row.budget}
                          onChange={(e) => updateRow(i, "budget", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">実績（円）</label>
                        <Input
                          className="h-7 text-xs mt-0.5"
                          placeholder="例: 1200000"
                          value={row.actual}
                          onChange={(e) => updateRow(i, "actual", e.target.value)}
                        />
                      </div>
                    </div>
                    {rate !== null && (
                      <p className="text-[10px] text-muted-foreground">
                        達成率: <span className={cn("font-medium", rate >= 100 ? "text-green-600" : rate < 80 ? "text-red-500" : "text-foreground")}>{rate}%</span>
                        　差異: <span className="font-medium text-foreground">
                          {Math.round((parseFloat(row.actual) - parseFloat(row.budget)) / 1000).toLocaleString()}千円
                        </span>
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <Button className="w-full" onClick={handleSave}>
            <Check className="h-4 w-4 mr-1.5" />
            保存
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── 小コンポーネント ──────────────────────────────────
function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-[9px] font-light text-muted-foreground uppercase tracking-[0.18em]", className)}>
      {children}
    </p>
  )
}

function Metric({ label, value, highlight, warn }: {
  label: string; value: string; highlight?: boolean; warn?: boolean
}) {
  return (
    <div>
      <p className="text-[9px] font-light text-muted-foreground tracking-[0.1em]">{label}</p>
      <p className={cn(
        "text-xl font-bold tracking-tight",
        highlight && "text-performance",
        warn && "text-destructive"
      )}>
        {value}
      </p>
    </div>
  )
}

// 千円単位で表示（1,200,000 → 1,200）
function formatSen(n: number) {
  return `${Math.round(n / 1000).toLocaleString()}`
}

// 差異（千円）：プラスは +、マイナスは −
function formatSenDiff(n: number) {
  const sen = Math.round(n / 1000)
  return sen >= 0 ? `+${sen.toLocaleString()}` : `${sen.toLocaleString()}`
}

// 差異（件数）
function formatCountDiff(n: number) {
  return n >= 0 ? `+${n}` : `${n}`
}

const STATUS_OPTIONS = SELECTABLE_STATUSES

function StatusSelector({ value, onChange }: { value: TaskStatus; onChange: (s: TaskStatus) => void }) {
  return (
    <div className="relative shrink-0">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as TaskStatus)}
        className={cn(
          "appearance-none text-[11px] font-medium rounded px-2 py-0.5 pr-5 border-0 cursor-pointer",
          STATUS_COLOR[value]
        )}
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>{STATUS_LABEL[s]}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none opacity-60" />
    </div>
  )
}

// ── ガントチャート（店長専用） ────────────────────────────────────────────────
function GanttSection({
  yearMonth,
  allTasks,
  allStaff,
}: {
  yearMonth: string
  allTasks: Task[]
  allStaff: Staff[]
}) {
  const [year, month] = yearMonth.split("-").map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()
  const todayDay = (() => {
    const t = new Date()
    return t.getFullYear() === year && t.getMonth() + 1 === month ? t.getDate() : null
  })()

  const parseDay = (dateStr: string): number => parseInt(dateStr.split("-")[2], 10)

  // スタッフ（店長以外）× タスク をグループ化、タスクが1件以上あるスタッフのみ
  const groups = allStaff
    .filter((s) => s.team !== "MGR")
    .map((s) => ({
      staff: s,
      tasks: allTasks.filter((t) => t.staffId === s.id && t.yearMonth === yearMonth),
    }))
    .filter((g) => g.tasks.length > 0)

  // タスクバーの位置・幅を計算（月内にクランプ）
  const getBarStyle = (task: Task): { left: string; width: string } | null => {
    if (!task.createdDate) return null
    const startMonth = task.createdDate.slice(0, 7)
    const endMonth = task.dueDate?.slice(0, 7) ?? ""

    let startDay = startMonth === yearMonth ? parseDay(task.createdDate) : 1
    let endDay = task.dueDate
      ? endMonth === yearMonth ? parseDay(task.dueDate) : daysInMonth
      : startDay + 1

    startDay = Math.max(1, Math.min(startDay, daysInMonth))
    endDay = Math.max(startDay, Math.min(endDay, daysInMonth))

    const left = ((startDay - 1) / daysInMonth) * 100
    const width = Math.max(((endDay - startDay + 1) / daysInMonth) * 100, 2)
    return { left: `${left.toFixed(1)}%`, width: `${width.toFixed(1)}%` }
  }

  const barColor: Record<TaskStatus, string> = {
    not_started: "bg-gray-300 text-gray-700",
    in_progress: "bg-blue-400 text-white",
    completed: "bg-green-400 text-white",
    stalled: "bg-red-400 text-white",
  }

  // 日付ティック（1, 5, 10, 15, 20, 25, 最終日）
  const ticks = [1, 5, 10, 15, 20, 25, daysInMonth].filter(
    (d, i, arr) => arr.indexOf(d) === i && d <= daysInMonth
  )

  return (
    <section className="space-y-3">
      <SectionLabel>全スタッフ タスク進捗 — {yearMonth}</SectionLabel>

      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          タスクがありません
        </p>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          {/* 日付ヘッダー */}
          <div className="flex border-b bg-muted/40 px-2 py-1.5">
            <div className="w-20 shrink-0" />
            <div className="flex-1 relative h-4">
              {ticks.map((day) => (
                <span
                  key={day}
                  className="absolute text-[9px] text-muted-foreground -translate-x-1/2 select-none"
                  style={{ left: `${((day - 1) / daysInMonth) * 100}%` }}
                >
                  {day}
                </span>
              ))}
              {/* 今日マーカー */}
              {todayDay !== null && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-primary/50"
                  style={{ left: `${((todayDay - 0.5) / daysInMonth) * 100}%` }}
                />
              )}
            </div>
          </div>

          {/* スタッフ行 */}
          {groups.map(({ staff, tasks }) => (
            <div key={staff.id} className="border-b last:border-0">
              <div className="flex px-2 py-2 hover:bg-muted/20 transition-colors">
                {/* スタッフ名列 */}
                <div className="w-20 shrink-0 pr-2">
                  <p className="text-[10px] font-normal leading-tight truncate">
                    {staff.name.split(" ")[0]}
                  </p>
                  <p className="text-[9px] font-light text-muted-foreground tracking-[0.1em]">{staff.team}</p>
                </div>

                {/* タスクバー列 */}
                <div className="flex-1 relative space-y-1">
                  {/* グリッド線 */}
                  <div className="absolute inset-0 pointer-events-none">
                    {ticks.map((day) => (
                      <div
                        key={day}
                        className="absolute top-0 bottom-0 w-px bg-border/40"
                        style={{ left: `${((day - 1) / daysInMonth) * 100}%` }}
                      />
                    ))}
                    {todayDay !== null && (
                      <div
                        className="absolute top-0 bottom-0 w-px bg-primary/30"
                        style={{ left: `${((todayDay - 0.5) / daysInMonth) * 100}%` }}
                      />
                    )}
                  </div>

                  {tasks.map((task) => {
                    const style = getBarStyle(task)
                    const status = task.status as TaskStatus
                    return (
                      <div key={task.id} className="relative h-5">
                        {style ? (
                          <div
                            className={cn(
                              "absolute inset-y-0.5 rounded-sm flex items-center px-1.5 overflow-hidden cursor-default",
                              barColor[status]
                            )}
                            style={style}
                            title={`${task.title}（${STATUS_LABEL[status]}${task.dueDate ? "・完了予定 " + task.dueDate : ""}）`}
                          >
                            <span className="text-[9px] truncate leading-none whitespace-nowrap">
                              {task.title}
                            </span>
                          </div>
                        ) : (
                          <div
                            className="absolute top-1.5 h-2 w-2 rounded-full bg-gray-300"
                            style={{ left: task.createdDate ? `${((parseDay(task.createdDate) - 1) / daysInMonth) * 100}%` : "0%" }}
                            title={task.title}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 凡例 */}
      <div className="flex flex-wrap gap-3 px-1">
        {SELECTABLE_STATUSES.map((s) => (
          <div key={s} className="flex items-center gap-1">
            <div className={cn("w-3 h-2 rounded-sm", barColor[s].split(" ")[0])} />
            <span className="text-[10px] text-muted-foreground">{STATUS_LABEL[s]}</span>
          </div>
        ))}
        {todayDay !== null && (
          <div className="flex items-center gap-1">
            <div className="w-px h-3 bg-primary/50" />
            <span className="text-[10px] text-muted-foreground">今日</span>
          </div>
        )}
      </div>
    </section>
  )
}
