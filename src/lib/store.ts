"use client"

import { create } from "zustand"
import {
  STAFF, CATEGORIES,
  Staff, Task, PerformanceRecord, MtgLog, Category,
} from "./mock-data"

interface AppState {
  selectedMonth: string
  selectedStaffId: string | null
  staff: Staff[]
  tasks: Task[]
  performance: PerformanceRecord[]
  mtgLogs: MtgLog[]
  categories: Category[]
  isManagerMode: boolean
  isLoading: boolean

  setSelectedMonth: (month: string) => void
  setSelectedStaffId: (id: string | null) => void
  setManagerMode: (v: boolean) => void

  // DB からデータをロードする
  loadMonthData: (yearMonth: string) => Promise<void>

  // タスク CRUD（API 経由）
  addTask: (task: Omit<Task, "id">) => Promise<void>
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  updateAdvice: (taskId: string, advice: string) => Promise<void>

  // MTGログ CRUD（API 経由）
  addMtgLog: (log: Omit<MtgLog, "id">) => Promise<void>
  updateMtgLog: (id: string, updates: Partial<MtgLog>) => Promise<void>

  // 実績（API 経由）
  upsertPerformance: (record: PerformanceRecord) => Promise<void>

  // スタッフ×月のデータ一括消去（実績 + タスク）
  clearStaffData: (staffId: string, yearMonth: string) => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  selectedMonth: "2026-07",
  selectedStaffId: null,
  staff: STAFF,
  tasks: [],
  performance: [],
  mtgLogs: [],
  categories: CATEGORIES,
  isManagerMode: false,
  isLoading: false,

  setSelectedMonth: (month) => {
    set({ selectedMonth: month })
    get().loadMonthData(month)
  },

  setSelectedStaffId: (id) => set({ selectedStaffId: id }),
  setManagerMode: (v) => set({ isManagerMode: v }),

  // ────────────────────────────────────────────────
  // データロード
  // ────────────────────────────────────────────────

  loadMonthData: async (yearMonth) => {
    set({ isLoading: true })
    try {
      const [tasksRes, perfRes, mtgRes] = await Promise.all([
        fetch(`/api/tasks?month=${yearMonth}`),
        fetch(`/api/performance?month=${yearMonth}`),
        fetch(`/api/mtg-logs?month=${yearMonth}`),
      ])
      const [tasks, performance, mtgLogs] = await Promise.all([
        tasksRes.json(),
        perfRes.json(),
        mtgRes.json(),
      ])
      set({ tasks, performance, mtgLogs })
    } catch (e) {
      console.error("loadMonthData failed:", e)
    } finally {
      set({ isLoading: false })
    }
  },

  // ────────────────────────────────────────────────
  // タスク
  // ────────────────────────────────────────────────

  addTask: async (task) => {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task),
    })
    const created: Task = await res.json()
    set((s) => ({ tasks: [...s.tasks, created] }))
  },

  updateTask: (id, updates) => {
    // 楽観的更新（UI を即座に反映）
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }))
    return fetch(`/api/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    }).then(() => {}) // エラー時は次回ロード時に修正される
  },

  deleteTask: (id) => {
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
    return fetch(`/api/tasks/${id}`, { method: "DELETE" }).then(() => {})
  },

  updateAdvice: (taskId, advice) => {
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, advice } : t)),
    }))
    return fetch(`/api/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ advice }),
    }).then(() => {})
  },

  // ────────────────────────────────────────────────
  // MTGログ
  // ────────────────────────────────────────────────

  addMtgLog: async (log) => {
    const res = await fetch("/api/mtg-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(log),
    })
    const created: MtgLog = await res.json()
    set((s) => ({ mtgLogs: [...s.mtgLogs, created] }))
  },

  updateMtgLog: (id, updates) => {
    set((s) => ({
      mtgLogs: s.mtgLogs.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    }))
    return fetch(`/api/mtg-logs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    }).then(() => {})
  },

  // ────────────────────────────────────────────────
  // 実績
  // ────────────────────────────────────────────────

  upsertPerformance: async (record) => {
    const res = await fetch("/api/performance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`upsertPerformance failed: ${res.status} ${text.slice(0, 200)}`)
    }
    const saved: PerformanceRecord = await res.json()
    set((s) => {
      const exists = s.performance.some(
        (p) => p.staffId === saved.staffId && p.yearMonth === saved.yearMonth
      )
      return {
        performance: exists
          ? s.performance.map((p) =>
              p.staffId === saved.staffId && p.yearMonth === saved.yearMonth
                ? saved
                : p
            )
          : [...s.performance, saved],
      }
    })
  },

  clearStaffData: async (staffId, yearMonth) => {
    // 実績を削除
    await fetch(`/api/performance?staffId=${staffId}&month=${yearMonth}`, {
      method: "DELETE",
    })
    // タスクを一括削除
    const { tasks } = get()
    const targetTasks = tasks.filter(
      (t) => t.staffId === staffId && t.yearMonth === yearMonth
    )
    await Promise.all(
      targetTasks.map((t) =>
        fetch(`/api/tasks/${t.id}`, { method: "DELETE" })
      )
    )
    // ローカルstate を更新
    set((s) => ({
      performance: s.performance.filter(
        (p) => !(p.staffId === staffId && p.yearMonth === yearMonth)
      ),
      tasks: s.tasks.filter(
        (t) => !(t.staffId === staffId && t.yearMonth === yearMonth)
      ),
    }))
  },
}))
