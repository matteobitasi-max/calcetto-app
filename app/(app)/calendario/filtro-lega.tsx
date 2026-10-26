'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { Admin, Stemma } from '@/components/lega-menu'

export type VoceFiltro = { id: string; nome: string; logo: string | null; organizzatore: boolean }

// Menu in cima al calendario: tutte le mie leghe (predefinito) o una sola, con logo e pallino "A" se organizzo.
export function FiltroLega({ leghe, scelta, mese }: { leghe: VoceFiltro[]; scelta: string; mese: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const attuale = leghe.find((l) => l.id === scelta)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  const scegli = (lega: string) => {
    setOpen(false)
    startTransition(() => router.replace(`/calendario?mese=${mese}${lega === 'tutte' ? '' : `&lega=${lega}`}`, { scroll: false }))
  }

  const voce = (attiva: boolean) =>
    `flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
      attiva ? 'bg-green-50 font-semibold dark:bg-green-950' : ''
    }`

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-left font-medium disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900"
      >
        {attuale ? (
          <>
            <Stemma lega={attuale} size={28} />
            <span className="min-w-0 flex-1 truncate">{attuale.nome}</span>
            {attuale.organizzatore && <Admin />}
          </>
        ) : (
          <>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center text-lg">🌐</span>
            <span className="min-w-0 flex-1 truncate">Tutte le mie leghe ({leghe.length})</span>
          </>
        )}
        <span className="text-xs text-zinc-500" aria-hidden>
          {pending ? '…' : '▾'}
        </span>
      </button>

      {open && (
        <div role="listbox" className="absolute inset-x-0 z-30 mt-1 max-h-80 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <button type="button" role="option" aria-selected={!attuale} className={voce(!attuale)} onClick={() => scegli('tutte')}>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center">🌐</span>
            <span className="flex-1 truncate">Tutte le mie leghe ({leghe.length})</span>
          </button>
          <hr className="my-1 border-zinc-200 dark:border-zinc-800" />
          {leghe.map((l) => (
            <button key={l.id} type="button" role="option" aria-selected={l.id === scelta} className={voce(l.id === scelta)} onClick={() => scegli(l.id)}>
              <Stemma lega={l} size={24} />
              <span className="min-w-0 flex-1 truncate">{l.nome}</span>
              {l.organizzatore && <Admin />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
