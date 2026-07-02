"use client"

import { useState } from "react"
import { useAppStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { STATUS_LABEL, STATUS_COLOR, TaskStatus } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { Plus, Trash2 } from "lucide-react"

export function PaneTasks() {
  const { selectedStaffId, selectedMonth, tasks, addTask, deleteTask, staff } = useAppStore()
  const [newTitle, setNewTitle] = useState("")

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
    })
    setNewTitle("")
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
      <div className="p-3 border-b">
        <p className="text-xs font-semibold text-muted-foreground mb-2">
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
          <Button size="sm" onClick={handleAdd} className="h-8 px-2">
            <Plus className="h-4 w-4" />
          </Button>
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
              <div
                key={task.id}
                className="flex items-start gap-2 rounded-lg border p-2.5 bg-card"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug">{task.title}</p>
                  <Badge
                    className={cn("text-[10px] px-1.5 py-0 mt-1.5", STATUS_COLOR[task.status as TaskStatus])}
                    variant="secondary"
                  >
                    {STATUS_LABEL[task.status as TaskStatus]}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => deleteTask(task.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
