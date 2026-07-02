import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month")
  if (!month) {
    return NextResponse.json({ error: "month is required" }, { status: 400 })
  }
  const logs = await prisma.mtgLog.findMany({
    where: { yearMonth: month },
    orderBy: { meetingDate: "asc" },
  })
  return NextResponse.json(logs)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const log = await prisma.mtgLog.create({
    data: {
      categoryId: body.categoryId,
      yearMonth: body.yearMonth,
      meetingDate: body.meetingDate,
      content: body.content ?? "",
      relatedTaskIds: body.relatedTaskIds ?? [],
    },
  })
  return NextResponse.json(log, { status: 201 })
}
