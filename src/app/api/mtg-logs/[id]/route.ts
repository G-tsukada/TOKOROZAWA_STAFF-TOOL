import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const log = await prisma.mtgLog.update({
    where: { id },
    data: {
      ...(body.content !== undefined && { content: body.content }),
      ...(body.meetingDate !== undefined && { meetingDate: body.meetingDate }),
      ...(body.relatedTaskIds !== undefined && {
        relatedTaskIds: body.relatedTaskIds,
      }),
    },
  })
  return NextResponse.json(log)
}
