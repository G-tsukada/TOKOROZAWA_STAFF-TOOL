"use client"

import { useState } from "react"
import { useAppStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { STATUS_LABEL, STATUS_COLOR, TaskStatus } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { Plus, Trash2, Pencil, Check, X, MessageSquare } from "lucide-react"

const today = new Date().toISOString().slice(0, 10)

function DateLabel({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <span className="text-[10px] text-muted-foreground">
      {label}: {value}
    </span>
  )
}

export function PaneTasks() {
  const { selectedStaffId, selectedMonth, tasks, addTask, updateTask, deleteTask, staff, mtgLogs } =
    useAppStore()

  const [newTitle, setNewTitle] = useState("")
  const [newCreatedDate, setNewCreatedDate] = useState(today)
  const [newDueDate, setNewDueDate] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{
    title: string
    status: TaskStatus
    createdDate: string
    dueDate: string
  } | null>(null)

  const selectedStaff = staff.find((s) => s.id === selectedStaffId)
  const filteredTasks = tasks.filter(
    (t) => t.staffId === selectedStaffId && t.yearMonth === selectedMonth
  )

  const handleAdd = () => {
    if (!newTitle.trim() || !selectedStaffId) return
    addTask({
      staffId: selectedStaffId,
      yearMonth: selectedMonth,
      title: newTitle.trim(),
      status: "not_started",
      memo: "",
      advice: "",
      createdDate: newCreatedDate,
      dueDate: newDueDate,
    })
    setNewTitle("")
    setNewCreatedDate(today)
    setNewDueDate("")
  }

  const startEdit = (task: (typeof filteredTasks)[number]) => {
    setEditingId(task.id)
    setEditForm({
      title: task.title,
      status: task.status as TaskStatus,
      createdDate: task.createdDate,
      dueDate: task.dueDate,
    })
  }

  const saveEdit = (id: string) => {
    if (!editForm) return
    updateTask(id, editForm)
    setEditingId(null)
    setEditForm(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm(null)
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
      {/* 追加フォーム */}
      <div className="p-3 border-b space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">
          {selectedStaff?.name} のタスク
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="タスクを追加..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="text-sm h-8"
          />
          <Button size="sm" onClick={handleAdd} className="h-8 px-2 shrink-0">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-[11px] text-muted-foreground w-14 shrink-0">入力日</label>
          <Input
            type="date"
            value={newCreatedDate}
            onChange={(e) => setNewCreatedDate(e.target.value)}
            className="text-xs h-7 flex-1"
          />
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-[11px] text-muted-foreground w-14 shrink-0">完了予定</label>
          <Input
            type="date"
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
            className="text-xs h-7 flex-1"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {filteredTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              タスクがありません
            </p>
          ) : (
            filteredTasks.map((task) => (
              editingId === task.id && editForm ? (
                /* ── 編集モード ── */
                <div key={task.id} className="rounded-lg border p-2.5 bg-card space-y-2">
                  <Input
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="text-sm h-8"
                  />
                  <Select
                    value={editForm.status}
                    onValueChange={(v) =>
                      setEditForm({ ...editForm, status: v as TaskStatus })
                    }
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STATUS_LABEL) as TaskStatus[]).map((s) => (
                        <SelectItem key={s} value={s} className="text-xs">
                          {STATUS_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2 items-center">
                    <label className="text-[11px] text-muted-foreground w-14 shrink-0">入力日</label>
                    <Input
                      type="date"
                      value={editForm.createdDate}
                      onChange={(e) =>
                        setEditForm({ ...editForm, createdDate: e.target.value })
                      }
                      className="text-xs h-7 flex-1"
                    />
                  </div>
                  <div className="flex gap-2 items-center">
                    <label className="text-[11px] text-muted-foreground w-14 shrink-0">完了予定</label>
                    <Input
                      type="date"
                      value={editForm.dueDate}
                      onChange={(e) =>
                        setEditForm({ ...editForm, dueDate: e.target.value })
                      }
                      className="text-xs h-7 flex-1"
                    />
                  </div>
                  <div className="flex gap-1 justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs"
                      onClick={cancelEdit}
                    >
                      <X className="h-3 w-3 mr-1" />
                      キャンセル
                    </Button>
                    <Button
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => saveEdit(task.id)}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      保存
                    </Button>
                  </div>
                </div>
              ) : (
                /* ── 表示モード ── */
                <TaskCard
                  key={task.id}
                  task={task}
                  linkedLogCount={mtgLogs.filter((l) => l.relatedTaskIds.includes(task.id)).length}
                  linkedLogDates={mtgLogs
                    .filter((l) => l.relatedTaskIds.includes(task.id))
                    .map((l) =>
                      new Date(l.meetingDate).toLocaleDateString("ja-JP", {
                        month: "short",
                        day: "numeric",
                      })
                    )}
                  onEdit={() => startEdit(task)}
                  onDelete={() => deleteTask(task.id)}
                />
            )))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// ── タスクカード（表示モード） ──────────────────────────────────────────────
import { Task } from "@/lib/mock-data"

function TaskCard({
  task,
  linkedLogCount,
  linkedLogDates,
  onEdit,
  onDelete,
}: {
  task: Task
  linkedLogCount: number
  linkedLogDates: string[]
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border p-2.5 bg-card">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug">{task.title}</p>
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          <Badge
            className={cn("text-[10px] px-1.5 py-0", STATUS_COLOR[task.status as TaskStatus])}
            variant="secondary"
          >
            {STATUS_LABEL[task.status as TaskStatus]}
          </Badge>
          <DateLabel label="入力" value={task.createdDate} />
          <DateLabel label="完了予定" value={task.dueDate} />
        </div>
        {linkedLogCount > 0 && (
          <div className="flex items-center gap-1 mt-1.5 rounded-md bg-primary/5 px-1.5 py-0.5 w-fit">
            <MessageSquare className="h-2.5 w-2.5 text-primary/70" />
            <span className="text-[10px] text-primary font-medium">
              MTG {linkedLogCount}件
            </span>
            <span className="text-[10px] text-muted-foreground">
              {linkedLogDates.join("・")}
            </span>
          </div>
        )}
      </div>
      <div className="flex gap-0.5 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={onEdit}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
