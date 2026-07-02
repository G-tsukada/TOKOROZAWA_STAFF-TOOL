import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month")
  if (!month) {
    return NextResponse.json({ error: "month is required" }, { status: 400 })
  }
  const tasks = await prisma.task.findMany({
    where: { yearMonth: month },
    orderBy: { createdAt: "asc" },
  })
  return NextResponse.json(tasks)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const task = await prisma.task.create({
    data: {
      staffId: body.staffId,
      yearMonth: body.yearMonth,
      title: body.title,
      status: body.status ?? "not_started",
      memo: body.memo ?? "",
      advice: body.advice ?? "",
      createdDate: body.createdDate,
      dueDate: body.dueDate ?? "",
    },
  })
  return NextResponse.json(task, { status: 201 })
}
