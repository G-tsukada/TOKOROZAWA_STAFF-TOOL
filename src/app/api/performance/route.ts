import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month")
  if (!month) {
    return NextResponse.json({ error: "month is required" }, { status: 400 })
  }
  const records = await prisma.performanceRecord.findMany({
    where: { yearMonth: month },
  })
  return NextResponse.json(records)
}

export async function DELETE(req: NextRequest) {
  const staffId = req.nextUrl.searchParams.get("staffId")
  const month = req.nextUrl.searchParams.get("month")
  if (!staffId || !month) {
    return NextResponse.json({ error: "staffId and month are required" }, { status: 400 })
  }
  await prisma.performanceRecord.deleteMany({
    where: { staffId, yearMonth: month },
  })
  return NextResponse.json({ ok: true })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const record = await prisma.performanceRecord.upsert({
    where: {
      staffId_yearMonth: {
        staffId: body.staffId,
        yearMonth: body.yearMonth,
      },
    },
    update: {
      sales: body.sales ?? 0,
      target: body.target ?? 0,
      customerCount: body.customerCount ?? 0,
      customerTarget: body.customerTarget ?? 0,
      categoryMetrics: body.categoryMetrics ?? {},
    },
    create: {
      staffId: body.staffId,
      yearMonth: body.yearMonth,
      sales: body.sales ?? 0,
      target: body.target ?? 0,
      customerCount: body.customerCount ?? 0,
      customerTarget: body.customerTarget ?? 0,
      categoryMetrics: body.categoryMetrics ?? {},
    },
  })
  return NextResponse.json(record)
}
