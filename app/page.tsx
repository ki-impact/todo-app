'use client'

import { useEffect, useRef, useState } from 'react'

interface Todo {
  id: number
  title: string
  done: boolean
  createdAt: string
}

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/todos')
      .then((r) => r.json())
      .then((data) => {
        setTodos(data)
        setLoading(false)
      })
  }, [])

  async function addTodo(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    const res = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: input }),
    })
    const todo = await res.json()
    setTodos((prev) => [todo, ...prev])
    setInput('')
    inputRef.current?.focus()
  }

  async function toggleTodo(todo: Todo) {
    const res = await fetch(`/api/todos/${todo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: !todo.done }),
    })
    const updated = await res.json()
    setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
  }

  async function deleteTodo(id: number) {
    await fetch(`/api/todos/${id}`, { method: 'DELETE' })
    setTodos((prev) => prev.filter((t) => t.id !== id))
  }

  const done = todos.filter((t) => t.done).length
  const total = todos.length

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-4 py-16">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight">Todo</h1>
          {total > 0 && (
            <p className="text-zinc-500 text-sm mt-1">
              {done} von {total} erledigt
            </p>
          )}
        </div>

        {/* Input */}
        <form onSubmit={addTodo} className="flex gap-2 mb-8">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Neue Aufgabe..."
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm
              placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="bg-zinc-100 text-zinc-900 rounded-lg px-4 py-2.5 text-sm font-medium
              hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Hinzufügen
          </button>
        </form>

        {/* List */}
        {loading ? (
          <p className="text-zinc-600 text-sm text-center py-8">Lädt...</p>
        ) : todos.length === 0 ? (
          <p className="text-zinc-600 text-sm text-center py-8">Noch keine Aufgaben.</p>
        ) : (
          <ul className="space-y-2">
            {todos.map((todo) => (
              <li
                key={todo.id}
                className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 group"
              >
                <button
                  onClick={() => toggleTodo(todo)}
                  className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                    todo.done
                      ? 'border-emerald-500 bg-emerald-500'
                      : 'border-zinc-700 hover:border-zinc-500'
                  }`}
                >
                  {todo.done && (
                    <svg viewBox="0 0 10 10" className="w-3 h-3" fill="none">
                      <path
                        d="M2 5l2.5 2.5L8 3"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
                <span
                  className={`flex-1 text-sm ${todo.done ? 'line-through text-zinc-600' : 'text-zinc-100'}`}
                >
                  {todo.title}
                </span>
                <button
                  onClick={() => deleteTodo(todo.id)}
                  className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all"
                >
                  <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor">
                    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
                    <path
                      fillRule="evenodd"
                      d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"
                    />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}

        {done > 0 && (
          <button
            onClick={async () => {
              const doneTodos = todos.filter((t) => t.done)
              await Promise.all(
                doneTodos.map((t) => fetch(`/api/todos/${t.id}`, { method: 'DELETE' }))
              )
              setTodos((prev) => prev.filter((t) => !t.done))
            }}
            className="mt-6 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Erledigte löschen ({done})
          </button>
        )}
      </div>
    </main>
  )
}
