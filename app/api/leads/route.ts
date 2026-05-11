import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const leads = await prisma.lead.findMany({
    include: { research: true, email_draft: true },
    orderBy: { created_at: 'desc' },
  })
  return NextResponse.json(leads)
}

export async function PATCH(request: Request) {
  const { id, status, score } = await request.json()
  const updated = await prisma.lead.update({ where: { id }, data: { status, score } })
  return NextResponse.json(updated)
}