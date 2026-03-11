import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { done, title } = await req.json()
  const todo = await prisma.todo.update({
    where: { id: Number(id) },
    data: { ...(done !== undefined && { done }), ...(title !== undefined && { title }) },
  })
  return NextResponse.json(todo)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.todo.delete({ where: { id: Number(id) } })
  return NextResponse.json({ ok: true })
}
