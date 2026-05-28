'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

export type ToastKind = 'success' | 'error' | 'info'

type Toast = {
  id: string
  kind: ToastKind
  title: string
  detail?: string
}

type ToastContextValue = {
  toast: (input: { kind?: ToastKind; title: string; detail?: string }) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    return { toast: () => { /* no-op when provider missing */ } }
  }
  return ctx
}

export function Toaster({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((input: { kind?: ToastKind; title: string; detail?: string }) => {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const next: Toast = { id, kind: input.kind ?? 'info', title: input.title, detail: input.detail }
    setToasts((prev) => [...prev, next])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 left-5 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <ToastView key={t.id} toast={t} onDismiss={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastView({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [entering, setEntering] = useState(true)
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntering(false))
    return () => cancelAnimationFrame(id)
  }, [])

  const palette = TOAST_PALETTE[toast.kind]

  return (
    <div
      className={`pointer-events-auto rounded-lg border bg-white px-3.5 py-2.5 min-w-[260px] max-w-[420px] flex items-start gap-2.5 transition-all duration-200 ${
        entering ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'
      }`}
      style={{ boxShadow: 'var(--shadow-md)', borderColor: palette.border }}
    >
      <div className={`w-1.5 h-1.5 mt-1.5 rounded-full ${palette.dot} shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-medium text-[var(--heading)] leading-tight">{toast.title}</div>
        {toast.detail && (
          <div className="text-[11px] text-[var(--muted)] mt-0.5 leading-snug">{toast.detail}</div>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="text-[var(--muted)] hover:text-[var(--heading)] shrink-0"
        aria-label="Dismiss"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

const TOAST_PALETTE: Record<ToastKind, { dot: string; border: string }> = {
  success: { dot: 'bg-[var(--success)]', border: 'var(--success-border)' },
  error: { dot: 'bg-[var(--error)]', border: 'var(--error-border)' },
  info: { dot: 'bg-[var(--accent)]', border: 'var(--card-border-strong)' },
}
