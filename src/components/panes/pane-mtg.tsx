"use client"

import { useState } from "react"
import { useAppStore } from "@/lib/store"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CATEGORIES } from "@/lib/mock-data"
import { Plus, Link2 } from "lucide-react"

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

  // このスタッフが担当するカテゴリのMTGを自動表示
  const autoLogs = selectedStaffId
    ? mtgLogs.filter((log) => {
        const s = staff.find((x) => x.id === selectedStaffId)
        return s?.categories.includes(log.categoryId) && log.yearMonth === selectedMonth
      })
    : []

  // 担当なしの場合は手動タグされたものを表示（今回は省略して空）
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
        <p className="text-xs font-semibold text-muted-foreground">
          MTG ログ — {selectedStaff?.name}
        </p>
        <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setAddOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> 追加
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {logs.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              {selectedStaff?.categories.length === 0
                ? "担当カテゴリなし（MTGログは手動タグで追加できます）"
                : "このスタッフのMTGログはありません"}
            </div>
          ) : (
            logs.map((log) => {
              const category = CATEGORIES.find((c) => c.id === log.categoryId)
              const relatedTasks = tasks.filter((t) =>
                log.relatedTaskIds.includes(t.id)
              )
              return (
                <div key={log.id} className="rounded-lg border bg-card overflow-hidden">
                  {/* ヘッダー */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border-b">
                    <Badge variant="outline" className="text-[10px] px-1.5">
                      {category?.name ?? log.categoryId}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.meetingDate).toLocaleDateString("ja-JP", {
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  {/* 本文 */}
                  <div className="p-3 space-y-2">
                    <p className="text-xs leading-relaxed whitespace-pre-wrap text-foreground">
                      {log.content}
                    </p>
                    {relatedTasks.length > 0 && (
                      <div className="border-t pt-2 flex flex-wrap gap-1">
                        <Link2 className="h-3 w-3 text-muted-foreground mt-0.5" />
                        {relatedTasks.map((t) => (
                          <Badge key={t.id} variant="secondary" className="text-[10px]">
                            {t.title}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>

      {/* MTG追加ダイアログ */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>MTGログを追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">カテゴリ</label>
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
              <label className="text-xs font-medium">日付</label>
              <Input
                type="date"
                className="mt-1 text-sm"
                value={form.meetingDate}
                onChange={(e) => setForm((f) => ({ ...f, meetingDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium">内容（Geminiで要約したテキストを貼り付け）</label>
              <Textarea
                className="mt-1 text-sm min-h-[120px]"
                placeholder="MTGの要約を貼り付けてください..."
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              />
            </div>
            {staffTasks.length > 0 && (
              <div>
                <label className="text-xs font-medium">関連タスク（任意）</label>
                <div className="mt-1 space-y-1">
                  {staffTasks.map((t) => (
                    <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.relatedTaskIds.includes(t.id)}
                        onChange={() => toggleTask(t.id)}
                        className="rounded"
                      />
                      {t.title}
                    </label>
                  ))}
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
