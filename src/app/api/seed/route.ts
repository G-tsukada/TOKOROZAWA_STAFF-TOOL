import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { TASKS, PERFORMANCE, MTG_LOGS } from "@/lib/mock-data"

// POST /api/seed — モックデータを DB に一度だけ投入する
// すでにデータがある場合はスキップ
export async function POST() {
  const existingCount = await prisma.task.count()
  if (existingCount > 0) {
    return NextResponse.json({ message: "already seeded", skipped: true })
  }

  await prisma.$transaction([
    prisma.task.createMany({
      data: TASKS.map((t) => ({
        id: t.id,
        staffId: t.staffId,
        yearMonth: t.yearMonth,
        title: t.title,
        status: t.status,
        memo: t.memo,
        advice: t.advice,
        createdDate: t.createdDate,
        dueDate: t.dueDate,
      })),
      skipDuplicates: true,
    }),
    prisma.performanceRecord.createMany({
      data: PERFORMANCE.map((p) => ({
        staffId: p.staffId,
        yearMonth: p.yearMonth,
        sales: p.sales,
        target: p.target,
        customerCount: p.customerCount,
        customerTarget: p.customerTarget,
        categoryMetrics: p.categoryMetrics,
      })),
      skipDuplicates: true,
    }),
    prisma.mtgLog.createMany({
      data: MTG_LOGS.map((m) => ({
        id: m.id,
        categoryId: m.categoryId,
        yearMonth: m.yearMonth,
        meetingDate: m.meetingDate,
        content: m.content,
        relatedTaskIds: m.relatedTaskIds,
      })),
      skipDuplicates: true,
    }),
  ])

  return NextResponse.json({ message: "seeded successfully" })
}
