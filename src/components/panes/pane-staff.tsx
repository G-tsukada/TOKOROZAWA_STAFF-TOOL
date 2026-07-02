"use client"

import { useAppStore } from "@/lib/store"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

export function PaneStaff() {
  const { staff, selectedStaffId, setSelectedStaffId } = useAppStore()

  const mgr = staff.filter((s) => s.team === "MGR")
  const fn = staff.filter((s) => s.team === "FN")
  const ia = staff.filter((s) => s.team === "IA")

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        <Section label="店長" members={mgr} selectedId={selectedStaffId} onSelect={setSelectedStaffId} isManager />
        <Section label="FN（家具）" members={fn} selectedId={selectedStaffId} onSelect={setSelectedStaffId} />
        <Section label="IA（雑貨）" members={ia} selectedId={selectedStaffId} onSelect={setSelectedStaffId} />
      </div>
    </ScrollArea>
  )
}

function Section({
  label, members, selectedId, onSelect, isManager = false,
}: {
  label: string
  members: ReturnType<typeof useAppStore.getState>["staff"]
  selectedId: string | null
  onSelect: (id: string) => void
  isManager?: boolean
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
        {label}
      </p>
      <div className="space-y-1">
        {members.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={cn(
              "w-full text-left rounded-lg px-3 py-2.5 transition-colors",
              selectedId === s.id
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent"
            )}
          >
            <p className="text-sm font-medium leading-none">{s.name}</p>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {isManager ? (
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[10px] px-1.5 py-0",
                    selectedId === s.id && "bg-primary-foreground/20 text-primary-foreground"
                  )}
                >
                  店長
                </Badge>
              ) : s.categories.length === 0 ? (
                <span className="text-xs opacity-60">担当なし</span>
              ) : (
                s.categories.map((c) => (
                  <Badge
                    key={c}
                    variant="secondary"
                    className={cn(
                      "text-[10px] px-1.5 py-0",
                      selectedId === s.id && "bg-primary-foreground/20 text-primary-foreground"
                    )}
                  >
                    {c}
                  </Badge>
                ))
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
