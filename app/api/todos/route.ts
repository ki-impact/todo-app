import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const todos = await prisma.todo.findMany({
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(todos)
}

export async function POST(req: Request) {
  const { title } = await req.json()
  if (!title?.trim()) {
    return NextResponse.json({ error: 'Title required' }, { status: 400 })
  }
  const todo = await prisma.todo.create({ data: { title: title.trim() } })
  return NextResponse.json(todo, { status: 201 })
}
