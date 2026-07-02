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
  { id: "mgr1", name: "店長 A", team: "MGR", categories: [] },
  { id: "s1", name: "Aさん", team: "FN", categories: [] },
  { id: "s2", name: "Bさん", team: "FN", categories: ["TEX"] },
  { id: "s3", name: "Cさん", team: "FN", categories: ["DSB"] },
  { id: "s4", name: "Dさん", team: "IA", categories: ["CULTI", "GREEN"] },
  { id: "s5", name: "Eさん", team: "IA", categories: ["GREEN"] },
  { id: "s6", name: "Fさん", team: "IA", categories: ["VP"] },
  { id: "s7", name: "Gさん", team: "IA", categories: ["RANDOSERU"] },
  { id: "s8", name: "Hさん", team: "IA", categories: ["GIFT"] },
  { id: "s9", name: "Iさん", team: "IA", categories: ["CULTI"] },
  { id: "s10", name: "Jさん", team: "IA", categories: [] },
]

export const TASKS: Task[] = [
  {
    id: "t1", staffId: "s6", yearMonth: "2026-07",
    title: "カテゴリ商品ディスプレイ更新", status: "stalled",
    memo: "先週から着手予定だったが未実施",
    advice: "まず1コーナーだけ先行して実施してみる",
    createdDate: "2026-07-01", dueDate: "2026-07-20",
  },
  {
    id: "t2", staffId: "s6", yearMonth: "2026-07",
    title: "週次朝会での担当カテゴリ共有", status: "in_progress",
    memo: "先週から開始。資料準備に時間がかかっている",
    advice: "",
    createdDate: "2026-07-07", dueDate: "",
  },
  {
    id: "t3", staffId: "s4", yearMonth: "2026-07",
    title: "フレグランスゾーン整備", status: "completed",
    memo: "7/10完了。前週比売上増",
    advice: "",
    createdDate: "2026-07-01", dueDate: "2026-07-10",
  },
  {
    id: "t4", staffId: "s4", yearMonth: "2026-07",
    title: "グリーンコーナー管理マニュアル作成", status: "not_started",
    memo: "",
    advice: "",
    createdDate: "2026-07-01", dueDate: "2026-07-31",
  },
  {
    id: "t5", staffId: "s2", yearMonth: "2026-07",
    title: "展示サンプル配置見直し", status: "in_progress",
    memo: "棚の配置変更中",
    advice: "",
    createdDate: "2026-07-05", dueDate: "",
  },
  {
    id: "t6", staffId: "s1", yearMonth: "2026-07",
    title: "接客ロールプレイング練習", status: "not_started",
    memo: "",
    advice: "",
    createdDate: "2026-07-08", dueDate: "2026-07-25",
  },
  {
    id: "t7", staffId: "s3", yearMonth: "2026-07",
    title: "新商品ラインナップ確認・共有", status: "in_progress",
    memo: "カタログ確認済み。チームへの共有を準備中",
    advice: "",
    createdDate: "2026-07-03", dueDate: "2026-07-18",
  },
]

export const PERFORMANCE: PerformanceRecord[] = [
  {
    staffId: "s6", yearMonth: "2026-07",
    sales: 1130000, target: 1400000,
    customerCount: 41, customerTarget: 48,
    categoryMetrics: {
      "カテゴリX売上": { budget: 1400000, actual: 1130000 },
    }
  },
  {
    staffId: "s4", yearMonth: "2026-07",
    sales: 1050000, target: 950000,
    customerCount: 55, customerTarget: 50,
    categoryMetrics: {
      "カテゴリY売上": { budget: 520000, actual: 610000 },
      "カテゴリZ売上": { budget: 430000, actual: 440000 },
    }
  },
  {
    staffId: "s2", yearMonth: "2026-07",
    sales: 820000, target: 860000,
    customerCount: 33, customerTarget: 38,
    categoryMetrics: {
      "カテゴリW売上": { budget: 860000, actual: 820000 },
    }
  },
  {
    staffId: "s1", yearMonth: "2026-07",
    sales: 670000, target: 700000,
    customerCount: 28, customerTarget: 32,
    categoryMetrics: {}
  },
  {
    staffId: "s3", yearMonth: "2026-07",
    sales: 910000, target: 880000,
    customerCount: 44, customerTarget: 40,
    categoryMetrics: {
      "カテゴリV売上": { budget: 880000, actual: 910000 },
    }
  },
]

export const MTG_LOGS: MtgLog[] = [
  {
    id: "m1", categoryId: "VP", yearMonth: "2026-07",
    meetingDate: "2026-07-15",
    content: "カテゴリX MTG\n\n今月の売上動向を確認。展示効果の測定を行い、レイアウトを見直す方針に。売れ筋ラインは引き続き好調。デザイン訴求が有効という共通認識を形成。\n\n次回アクション：ディスプレイ更新を来週中に実施予定。",
    relatedTaskIds: ["t1"]
  },
  {
    id: "m2", categoryId: "GREEN", yearMonth: "2026-07",
    meetingDate: "2026-07-08",
    content: "カテゴリZ 担当MTG\n\n夏場の商品管理について共有。陳列と補充のルールを統一する必要がある。管理マニュアルの整備が急務。\n\nDさん・Eさんで役割分担し、来週末までにドラフト作成予定。",
    relatedTaskIds: ["t4"]
  },
  {
    id: "m3", categoryId: "CULTI", yearMonth: "2026-07",
    meetingDate: "2026-07-05",
    content: "カテゴリY MTG\n\nゾーン整備の効果を確認。前週比で売上増加。ゾーニングが功を奏している。夏の新ラインナップの展開を7月末に予定。\n\n引き続き体験型接客を促進する方針。",
    relatedTaskIds: ["t3"]
  },
]

export const STATUS_LABEL: Record<TaskStatus, string> = {
  not_started: "未着手",
  in_progress: "進行中",
  completed: "完了",
  stalled: "停滞",
}

// 選択可能なステータス（停滞は選択不可・表示のみ）
export const SELECTABLE_STATUSES: TaskStatus[] = ["not_started", "in_progress", "completed"]

export const STATUS_COLOR: Record<TaskStatus, string> = {
  not_started: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  stalled: "bg-red-100 text-red-700",
}
