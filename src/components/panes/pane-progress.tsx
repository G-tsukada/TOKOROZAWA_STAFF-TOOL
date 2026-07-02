"use client"

import { useState } from "react"
import { useAppStore } from "@/lib/store"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { STATUS_LABEL, STATUS_COLOR, TaskStatus, PerformanceRecord, CategoryMetricItem } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { Lock, ChevronDown, Pencil, Plus, Trash2, Check, X } from "lucide-react"

const MANAGER_PIN = "1234"

// ---- 型 ----
type CategoryMetricRow = { key: string; budget: string; actual: string }

// ---- メインコンポーネント ----
export function PaneProgress() {
  const {
    selectedStaffId, selectedMonth, tasks, performance,
    staff, updateTask, updateAdvice, isManagerMode, setManagerMode,
    upsertPerformance,
  } = useAppStore()

  const [pinInput, setPinInput] = useState("")
  const [pinError, setPinError] = useState(false)
  const [pinDialogOpen, setPinDialogOpen] = useState(false)
  const [editPerfOpen, setEditPerfOpen] = useState(false)

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

  if (!selectedStaffId) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        ← スタッフを選択してください
      </div>
    )
  }

  const achievementRate = perf && perf.target ? Math.round((perf.sales / perf.target) * 100) : null
  const salesDiff = perf ? perf.sales - perf.target : null
  const customerRate = perf && perf.customerTarget ? Math.round((perf.customerCount / perf.customerTarget) * 100) : null
  const customerDiff = perf ? perf.customerCount - perf.customerTarget : null

  return (
    <>
      <ScrollArea className="h-full">
        <div className="p-3 space-y-4">

          {/* ── 実績サマリー ── */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <SectionLabel>実績サマリー — {selectedStaff?.name}</SectionLabel>
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
              <div className="rounded-lg border bg-card p-3 space-y-3">

                {/* 個人実績 */}
                <div>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <p className="text-[10px] font-semibold text-muted-foreground">個人実績</p>
                    <p className="text-[9px] text-muted-foreground">単位：千円</p>
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
                  <p className="text-[10px] font-semibold text-muted-foreground mb-1.5">接客件数</p>
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
                        <p className="text-[10px] font-semibold text-muted-foreground">カテゴリ実績</p>
                        <p className="text-[9px] text-muted-foreground">単位：千円</p>
                      </div>
                      <div className="space-y-3">
                        {Object.entries(perf.categoryMetrics).map(([k, item]) => {
                          const rate = item.budget ? Math.round((item.actual / item.budget) * 100) : null
                          const diff = item.actual - item.budget
                          return (
                            <div key={k}>
                              <p className="text-[10px] text-muted-foreground mb-1">{k}</p>
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
                      <p className="flex-1 text-sm font-medium leading-snug">{task.title}</p>
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
        </div>
      </ScrollArea>

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
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                個人実績
              </p>
              <p className="text-[10px] text-muted-foreground">単位：円</p>
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
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
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
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  カテゴリ実績
                </p>
                <p className="text-[10px] text-muted-foreground">単位：円</p>
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
    <p className={cn("text-xs font-semibold text-muted-foreground uppercase tracking-wide", className)}>
      {children}
    </p>
  )
}

function Metric({ label, value, highlight, warn }: {
  label: string; value: string; highlight?: boolean; warn?: boolean
}) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={cn(
        "text-lg font-bold",
        highlight && "text-green-600",
        warn && "text-red-500"
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

const STATUS_OPTIONS: TaskStatus[] = ["not_started", "in_progress", "completed", "stalled"]

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
