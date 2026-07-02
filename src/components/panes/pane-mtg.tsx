"use client"

import { useState } from "react"
import { useAppStore } from "@/lib/store"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CATEGORIES, TaskStatus, STATUS_LABEL, STATUS_COLOR } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { Plus, Link2, CalendarClock, CheckCircle2, Circle, Clock, AlertTriangle } from "lucide-react"

const STATUS_ICON: Record<TaskStatus, React.ReactNode> = {
  not_started: <Circle className="h-3 w-3" />,
  in_progress:  <Clock className="h-3 w-3" />,
  completed:    <CheckCircle2 className="h-3 w-3" />,
  stalled:      <AlertTriangle className="h-3 w-3" />,
}

export function PaneMtg() {
  const { selectedStaffId, selectedMonth, staff, mtgLogs, tasks, addMtgLog } = useAppStore()
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({
    categoryId: "",
    meetingDate: "",
    content: "",
    relatedTaskIds: [] as string[],
  })

  const selectedStaff = staff.find((s) => s.id === selectedStaffId)

  const autoLogs = selectedStaffId
    ? mtgLogs.filter((log) => {
        const s = staff.find((x) => x.id === selectedStaffId)
        return s?.categories.includes(log.categoryId) && log.yearMonth === selectedMonth
      })
    : []

  const logs = autoLogs.sort(
    (a, b) => new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime()
  )

  const staffTasks = tasks.filter(
    (t) => t.staffId === selectedStaffId && t.yearMonth === selectedMonth
  )

  const handleAdd = () => {
    if (!form.categoryId || !form.meetingDate || !form.content.trim()) return
    addMtgLog({
      categoryId: form.categoryId,
      yearMonth: selectedMonth,
      meetingDate: form.meetingDate,
      content: form.content,
      relatedTaskIds: form.relatedTaskIds,
    })
    setForm({ categoryId: "", meetingDate: "", content: "", relatedTaskIds: [] })
    setAddOpen(false)
  }

  const toggleTask = (id: string) => {
    setForm((f) => ({
      ...f,
      relatedTaskIds: f.relatedTaskIds.includes(id)
        ? f.relatedTaskIds.filter((x) => x !== id)
        : [...f.relatedTaskIds, id],
    }))
  }

  if (!selectedStaffId) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        ← スタッフを選択してください
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b flex items-center justify-between">
        <p className="text-[9px] font-light text-muted-foreground uppercase tracking-[0.18em]">
          MTG — {selectedStaff?.name}
        </p>
        <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setAddOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> 追加
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {logs.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              {selectedStaff?.categories.length === 0
                ? "担当カテゴリなし（MTGログは手動タグで追加できます）"
                : "このスタッフのMTGログはありません"}
            </div>
          ) : (
            logs.map((log) => {
              const category = CATEGORIES.find((c) => c.id === log.categoryId)
              const relatedTasks = tasks.filter((t) => log.relatedTaskIds.includes(t.id))

              // 本文の1行目をタイトルとして扱う
              const [titleLine, ...bodyLines] = log.content.split("\n")
              const bodyText = bodyLines.filter((l) => l.trim()).join("\n")

              return (
                <div key={log.id} className="rounded-xl border bg-card overflow-hidden shadow-sm">

                  {/* ── ヘッダー ── */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b">
                    <Badge variant="outline" className="text-[10px] px-1.5 font-semibold">
                      {category?.name ?? log.categoryId}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.meetingDate).toLocaleDateString("ja-JP", {
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>

                  {/* ── 本文 ── */}
                  <div className="px-3 pt-3 pb-2 space-y-1.5">
                    {titleLine && (
                      <p className="text-sm font-normal leading-snug">{titleLine}</p>
                    )}
                    {bodyText && (
                      <p className="text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
                        {bodyText}
                      </p>
                    )}
                  </div>

                  {/* ── 関連タスク ── */}
                  {relatedTasks.length > 0 && (
                    <div className="mx-3 mb-3 rounded-lg border border-dashed border-primary/30 bg-primary/[0.03] overflow-hidden">
                      {/* セクションヘッダー */}
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-primary/20 bg-primary/5">
                        <Link2 className="h-3 w-3 text-primary" />
                        <span className="text-[9px] font-light text-primary uppercase tracking-[0.15em]">
                          関連タスク
                        </span>
                        <span className="text-[10px] font-bold text-primary/70 ml-auto">
                          {relatedTasks.length}
                        </span>
                      </div>
                      {/* タスクリスト */}
                      <div className="divide-y divide-primary/10">
                        {relatedTasks.map((t) => {
                          const status = t.status as TaskStatus
                          return (
                            <div
                              key={t.id}
                              className="flex items-start gap-2 px-2.5 py-2"
                            >
                              {/* ステータスアイコン */}
                              <span className={cn(
                                "mt-0.5 shrink-0",
                                STATUS_COLOR[status].replace("bg-", "text-").replace("-100", "-600").replace("text-gray-700", "text-gray-400").replace("text-blue-700", "text-blue-500").replace("text-green-700", "text-green-600").replace("text-red-700", "text-red-500")
                              )}>
                                {STATUS_ICON[status]}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-normal leading-snug">{t.title}</p>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  <Badge
                                    variant="secondary"
                                    className={cn("text-[9px] px-1.5 py-0 h-4", STATUS_COLOR[status])}
                                  >
                                    {STATUS_LABEL[status]}
                                  </Badge>
                                  {t.dueDate && (
                                    <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                                      <CalendarClock className="h-2.5 w-2.5" />
                                      {t.dueDate}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>

      {/* ── MTG追加ダイアログ ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>MTGログを追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[9px] font-light text-muted-foreground uppercase tracking-[0.15em]">カテゴリ</label>
              <select
                className="mt-1 w-full border rounded-md px-3 py-1.5 text-sm bg-background"
                value={form.categoryId}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              >
                <option value="">選択してください</option>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-light text-muted-foreground uppercase tracking-[0.15em]">日付</label>
              <Input
                type="date"
                className="mt-1 text-sm"
                value={form.meetingDate}
                onChange={(e) => setForm((f) => ({ ...f, meetingDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-[9px] font-light text-muted-foreground uppercase tracking-[0.15em]">内容</label>
              <Textarea
                className="mt-1 text-sm min-h-[120px]"
                placeholder="MTGの要約を貼り付けてください..."
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              />
            </div>
            {staffTasks.length > 0 && (
              <div>
                <label className="text-[9px] font-light text-muted-foreground uppercase tracking-[0.15em]">関連タスク（任意）</label>
                <div className="mt-1 space-y-1.5 rounded-lg border p-2 bg-muted/30">
                  {staffTasks.map((t) => {
                    const checked = form.relatedTaskIds.includes(t.id)
                    return (
                      <label
                        key={t.id}
                        className={cn(
                          "flex items-center gap-2 text-sm cursor-pointer rounded-md px-2 py-1.5 transition-colors",
                          checked ? "bg-primary/10" : "hover:bg-muted"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTask(t.id)}
                          className="rounded accent-primary h-3.5 w-3.5"
                        />
                        <span className="flex-1 text-xs">{t.title}</span>
                        <Badge
                          variant="secondary"
                          className={cn("text-[9px] px-1.5 py-0", STATUS_COLOR[t.status as TaskStatus])}
                        >
                          {STATUS_LABEL[t.status as TaskStatus]}
                        </Badge>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
            <Button className="w-full" onClick={handleAdd}>追加</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
