'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, useTransition } from 'react'
import { scegliLega } from '@/app/actions'

export type LegaVoce = { id: string; nome: string; logo: string | null }

function Stemma({ lega, size = 28 }: { lega: LegaVoce; size?: number }) {
  return lega.logo ? (
    // eslint-disable-next-line @next/next/no-img-element -- miniatura già ridimensionata dal CDN di Sanity
    <img src={lega.logo} alt="" width={size} height={size} className="shrink-0 rounded-lg object-cover" style={{ width: size, height: size }} />
  ) : (
    <span
      className="flex shrink-0 items-center justify-center rounded-lg bg-green-600 font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {lega.nome.slice(0, 1).toUpperCase()}
    </span>
  )
}

// Nome della lega attiva nell'intestazione: toccandolo si cambia lega o se ne aggiunge una.
export function LegaMenu({ corrente, altre, organizzatore }: { corrente: LegaVoce; altre: LegaVoce[]; organizzatore: boolean }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const box = useRef<HTMLDivElement>(null)

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

  const voce = 'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800'

  return (
    <div ref={box} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex max-w-full items-center gap-2 rounded-lg px-1 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Stemma lega={corrente} />
        <span className="truncate font-semibold">{pending ? 'Cambio lega…' : corrente.nome}</span>
        <span className="text-xs text-zinc-500" aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <div role="menu" className="absolute left-0 z-30 mt-1 w-72 rounded-xl border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {altre.length > 0 && (
            <>
              <p className="px-3 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Le mie leghe</p>
              {altre.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  role="menuitem"
                  className={voce}
                  onClick={() => {
                    setOpen(false)
                    startTransition(() => scegliLega(l.id))
                  }}
                >
                  <Stemma lega={l} size={24} />
                  <span className="truncate">{l.nome}</span>
                </button>
              ))}
              <hr className="my-2 border-zinc-200 dark:border-zinc-800" />
            </>
          )}
          {organizzatore && (
            <Link href="/lega" role="menuitem" className={voce} onClick={() => setOpen(false)}>
              ⚙️ Impostazioni e inviti
            </Link>
          )}
          <Link href="/benvenuto" role="menuitem" className={voce} onClick={() => setOpen(false)}>
            ➕ Crea o entra in una lega
          </Link>
        </div>
      )}
    </div>
  )
}
