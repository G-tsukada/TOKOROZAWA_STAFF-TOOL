"use client"

import { MonthSelector } from "@/components/layout/month-selector"
import { PaneStaff } from "@/components/panes/pane-staff"
import { PaneTasks } from "@/components/panes/pane-tasks"
import { PaneProgress } from "@/components/panes/pane-progress"
import { PaneMtg } from "@/components/panes/pane-mtg"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Users, CheckSquare, BarChart2, Video } from "lucide-react"
import {
  Panel,
  Group as PanelGroup,
  Separator as PanelResizeHandle,
} from "react-resizable-panels"

const PANE_TABS = [
  { value: "staff", label: "スタッフ", icon: Users, component: PaneStaff },
  { value: "tasks", label: "タスク", icon: CheckSquare, component: PaneTasks },
  { value: "progress", label: "進捗", icon: BarChart2, component: PaneProgress },
  { value: "mtg", label: "MTG", icon: Video, component: PaneMtg },
]

export default function Home() {
  return (
    <div className="h-dvh flex flex-col bg-background">
      {/* ヘッダー */}
      <header className="border-b px-4 py-2 flex items-center gap-4 shrink-0">
        <h1 className="text-sm font-bold tracking-tight text-foreground">
          アクタス所沢 スタッフ管理
        </h1>
        <Separator orientation="vertical" className="h-5" />
        <MonthSelector />
      </header>

      {/* PC: 4ペイン リサイザブル（md以上） */}
      <div className="hidden md:flex flex-1 min-h-0 overflow-hidden">
        <PanelGroup direction="horizontal" className="flex-1">
          {/* Pane1 */}
          <Panel defaultSize={15} minSize={8}>
            <div className="flex flex-col h-full min-h-0">
              <PaneHeader label="スタッフ" icon={<Users className="h-3.5 w-3.5" />} />
              <div className="flex-1 min-h-0 overflow-hidden">
                <PaneStaff />
              </div>
            </div>
          </Panel>

          <ResizeHandle />

          {/* Pane2 */}
          <Panel defaultSize={18} minSize={8}>
            <div className="flex flex-col h-full min-h-0">
              <PaneHeader label="タスク" icon={<CheckSquare className="h-3.5 w-3.5" />} />
              <div className="flex-1 min-h-0 overflow-hidden">
                <PaneTasks />
              </div>
            </div>
          </Panel>

          <ResizeHandle />

          {/* Pane3 */}
          <Panel defaultSize={34} minSize={8}>
            <div className="flex flex-col h-full min-h-0">
              <PaneHeader label="実績 / 進捗" icon={<BarChart2 className="h-3.5 w-3.5" />} />
              <div className="flex-1 min-h-0 overflow-hidden">
                <PaneProgress />
              </div>
            </div>
          </Panel>

          <ResizeHandle />

          {/* Pane4 */}
          <Panel defaultSize={33} minSize={8}>
            <div className="flex flex-col h-full min-h-0">
              <PaneHeader label="MTG ログ" icon={<Video className="h-3.5 w-3.5" />} />
              <div className="flex-1 min-h-0 overflow-hidden">
                <PaneMtg />
              </div>
            </div>
          </Panel>
        </PanelGroup>
      </div>

      {/* スマホ: タブ切替（md未満） */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden md:hidden">
        <Tabs defaultValue="staff" className="flex flex-col h-full">
          <TabsList className="grid grid-cols-4 shrink-0 rounded-none border-b h-10">
            {PANE_TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex flex-col gap-0.5 h-full text-[10px] rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {PANE_TABS.map((tab) => (
            <TabsContent
              key={tab.value}
              value={tab.value}
              className="flex-1 min-h-0 overflow-hidden mt-0"
            >
              <tab.component />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}

function PaneHeader({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2 border-b bg-muted/30 shrink-0">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
    </div>
  )
}

function ResizeHandle() {
  return (
    <PanelResizeHandle
      style={{
        width: "6px",
        flexShrink: 0,
        background: "hsl(var(--border))",
        cursor: "col-resize",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLElement).style.background =
          "hsl(var(--primary) / 0.4)"
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLElement).style.background =
          "hsl(var(--border))"
      }}
    />
  )
}
