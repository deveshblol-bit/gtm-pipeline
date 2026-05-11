import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { subject, body, status } = await req.json()
  const draft = await prisma.emailDraft.update({
    where: { id: params.id },
    data: { subject, body, status },
  })
  return NextResponse.json(draft)
}