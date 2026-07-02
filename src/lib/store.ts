"use client"

import { create } from "zustand"
import {
  STAFF, TASKS, PERFORMANCE, MTG_LOGS, CATEGORIES,
  Staff, Task, PerformanceRecord, MtgLog, Category, TaskStatus
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

  setSelectedMonth: (month: string) => void
  setSelectedStaffId: (id: string | null) => void
  setManagerMode: (v: boolean) => void

  addTask: (task: Omit<Task, "id">) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  deleteTask: (id: string) => void

  addMtgLog: (log: Omit<MtgLog, "id">) => void
  updateMtgLog: (id: string, updates: Partial<MtgLog>) => void

  updateAdvice: (taskId: string, advice: string) => void

  upsertPerformance: (record: PerformanceRecord) => void
}

let taskCounter = 100
let mtgCounter = 100

export const useAppStore = create<AppState>((set) => ({
  selectedMonth: "2026-07",
  selectedStaffId: null,
  staff: STAFF,
  tasks: TASKS,
  performance: PERFORMANCE,
  mtgLogs: MTG_LOGS,
  categories: CATEGORIES,
  isManagerMode: false,

  setSelectedMonth: (month) => set({ selectedMonth: month }),
  setSelectedStaffId: (id) => set({ selectedStaffId: id }),
  setManagerMode: (v) => set({ isManagerMode: v }),

  addTask: (task) =>
    set((s) => ({
      tasks: [...s.tasks, { ...task, id: `t${++taskCounter}` }],
    })),

  updateTask: (id, updates) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),

  deleteTask: (id) =>
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

  addMtgLog: (log) =>
    set((s) => ({
      mtgLogs: [...s.mtgLogs, { ...log, id: `m${++mtgCounter}` }],
    })),

  updateMtgLog: (id, updates) =>
    set((s) => ({
      mtgLogs: s.mtgLogs.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    })),

  updateAdvice: (taskId, advice) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, advice } : t)),
    })),

  upsertPerformance: (record) =>
    set((s) => {
      const exists = s.performance.some(
        (p) => p.staffId === record.staffId && p.yearMonth === record.yearMonth
      )
      return {
        performance: exists
          ? s.performance.map((p) =>
              p.staffId === record.staffId && p.yearMonth === record.yearMonth
                ? record
                : p
            )
          : [...s.performance, record],
      }
    }),
}))
