export type Team = "FN" | "IA" | "MGR"
export type TaskStatus = "not_started" | "in_progress" | "completed" | "stalled"

export interface Category {
  id: string
  name: string
}

export interface Staff {
  id: string
  name: string
  team: Team
  categories: string[]
}

export interface Task {
  id: string
  staffId: string
  yearMonth: string
  title: string
  status: TaskStatus
  memo: string
  advice: string
  createdDate: string   // "YYYY-MM-DD"
  dueDate: string       // "YYYY-MM-DD"（未設定は空文字）
}

export interface CategoryMetricItem {
  budget: number
  actual: number
}

export interface PerformanceRecord {
  staffId: string
  yearMonth: string
  // 個人実績
  sales: number
  target: number
  // 接客件数
  customerCount: number
  customerTarget: number
  // カテゴリ実績（項目名 → 予算・実績ペア）
  categoryMetrics: Record<string, CategoryMetricItem>
}

export interface MtgLog {
  id: string
  categoryId: string
  yearMonth: string
  meetingDate: string
  content: string
  relatedTaskIds: string[]
}

export const CATEGORIES: Category[] = [
  { id: "VP", name: "VP" },
  { id: "TEX", name: "TEX" },
  { id: "DSB", name: "DSB" },
  { id: "CULTI", name: "CULTI" },
  { id: "GREEN", name: "グリーン" },
  { id: "RANDOSERU", name: "ランドセル" },
  { id: "GIFT", name: "ギフト" },
]

export const STAFF: Staff[] = [
  { id: "mgr1", name: "塚田 岳人", team: "MGR", categories: [] },
  { id: "s1", name: "勅使川原 純", team: "FN", categories: [] },
  { id: "s2", name: "鈴木 さおり", team: "FN", categories: ["TEX"] },
  { id: "s3", name: "吉川 夏子", team: "FN", categories: ["DSB"] },
  { id: "s4", name: "南澤 みづき", team: "IA", categories: ["CULTI", "GREEN"] },
  { id: "s5", name: "須部 馨代", team: "IA", categories: ["GREEN"] },
  { id: "s6", name: "高橋 佳愛", team: "IA", categories: ["VP"] },
  { id: "s7", name: "佐藤 みわ", team: "IA", categories: ["RANDOSERU"] },
  { id: "s8", name: "今泉 美恵子", team: "IA", categories: ["GIFT"] },
  { id: "s9", name: "森田 悦子", team: "IA", categories: ["CULTI"] },
  { id: "s10", name: "菊地 千尋", team: "IA", categories: [] },
]

export const TASKS: Task[] = [
  {
    id: "t1", staffId: "s6", yearMonth: "2026-07",
    title: "入口にVP商品POPを設置", status: "stalled",
    memo: "2週間未着手。他業務が重なり後回しになっている",
    advice: "まず入口正面の1点だけから始める。水曜閉店後10分で設置できる量から",
    createdDate: "2026-07-01", dueDate: "2026-07-20",
  },
  {
    id: "t2", staffId: "s6", yearMonth: "2026-07",
    title: "月曜朝会でVP売れ筋TOP3を報告", status: "in_progress",
    memo: "先週から開始。準備に10分かかっている",
    advice: "",
    createdDate: "2026-07-07", dueDate: "",
  },
  {
    id: "t3", staffId: "s4", yearMonth: "2026-07",
    title: "CULTIディスプレイ更新", status: "completed",
    memo: "7/10完了。売上前週比+15%",
    advice: "",
    createdDate: "2026-07-01", dueDate: "2026-07-10",
  },
  {
    id: "t4", staffId: "s4", yearMonth: "2026-07",
    title: "グリーンコーナー植物管理マニュアル作成", status: "not_started",
    memo: "",
    advice: "",
    createdDate: "2026-07-01", dueDate: "2026-07-31",
  },
  {
    id: "t5", staffId: "s2", yearMonth: "2026-07",
    title: "TEXサンプル展示見直し", status: "in_progress",
    memo: "棚の配置変更中",
    advice: "",
    createdDate: "2026-07-05", dueDate: "",
  },
]

export const PERFORMANCE: PerformanceRecord[] = [
  {
    staffId: "s6", yearMonth: "2026-07",
    sales: 1200000, target: 1500000,
    customerCount: 38, customerTarget: 45,
    categoryMetrics: {
      "VP売上": { budget: 1500000, actual: 1200000 },
    }
  },
  {
    staffId: "s4", yearMonth: "2026-07",
    sales: 980000, target: 900000,
    customerCount: 52, customerTarget: 50,
    categoryMetrics: {
      "CULTI売上": { budget: 500000, actual: 420000 },
      "グリーン売上": { budget: 400000, actual: 390000 },
    }
  },
  {
    staffId: "s2", yearMonth: "2026-07",
    sales: 750000, target: 800000,
    customerCount: 30, customerTarget: 35,
    categoryMetrics: {
      "TEX売上": { budget: 800000, actual: 750000 },
    }
  },
]

export const MTG_LOGS: MtgLog[] = [
  {
    id: "m1", categoryId: "VP", yearMonth: "2026-07",
    meetingDate: "2026-07-15",
    content: "VPカテゴリ実績MTG\n\n今月のVP商品の動向について確認。入口展示の効果測定を行い、POPの設置位置を見直す方針に。売れ筋TOP3は引き続きNシリーズ。価格訴求よりデザイン訴求が有効という共通認識を形成。\n\n次回アクション：POP設置を優先、来週中に実施予定。",
    relatedTaskIds: ["t1"]
  },
  {
    id: "m2", categoryId: "GREEN", yearMonth: "2026-07",
    meetingDate: "2026-07-08",
    content: "グリーン担当MTG\n\n夏場の植物管理について共有。水やりの頻度、遮光対策を統一する必要がある。管理マニュアルの整備が急務。\n\n南澤・須部で役割分担し、来週末までにドラフト作成予定。",
    relatedTaskIds: ["t4"]
  },
  {
    id: "m3", categoryId: "CULTI", yearMonth: "2026-07",
    meetingDate: "2026-07-05",
    content: "CULTIカテゴリMTG\n\nディスプレイ更新の効果を確認。前週比+15%の売上増。香りのゾーニングが功を奏している。夏の新ラインナップの展開を7月末に予定。\n\n引き続き試香を促す接客を継続する方針。",
    relatedTaskIds: ["t3"]
  },
]

export const STATUS_LABEL: Record<TaskStatus, string> = {
  not_started: "未着手",
  in_progress: "進行中",
  completed: "完了",
  stalled: "停滞",
}

export const STATUS_COLOR: Record<TaskStatus, string> = {
  not_started: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  stalled: "bg-red-100 text-red-700",
}
