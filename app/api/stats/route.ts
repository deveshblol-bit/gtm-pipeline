import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const stats = await prisma.lead.groupBy({ by: ['status'], _count: true })
  const bySource = await prisma.lead.groupBy({ by: ['source'], _count: true })
  const recentActivity = await prisma.activityLog.findMany({ orderBy: { created_at: 'desc' }, take: 20 })
  const total = await prisma.lead.count()
  return NextResponse.json({ stats, bySource, recentActivity, total })
}