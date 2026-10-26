'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, useTransition } from 'react'
import { scegliLega } from '@/app/actions'
import { LogoC } from './logo-c'
import { PallinoAdmin } from './pallino-admin'

// Pallino "A" accanto alle leghe in cui sono organizzatore.
export const Admin = () => <PallinoAdmin title="Sei organizzatore" />

/** `organizzatore`: sono organizzatore di questa lega (mostra il pallino "A"). */
export type LegaVoce = { id: string; nome: string; logo: string | null; organizzatore?: boolean }

export function Stemma({ lega, size = 28 }: { lega: Pick<LegaVoce, 'nome' | 'logo'>; size?: number }) {
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
// Il titolare dell'app (super admin) ha anche "Tutte le leghe"; `ospite` = è in una lega non sua.
export function LegaMenu({
  corrente,
  altre,
  organizzatore,
  titolare = false,
  ospite = false,
}: {
  corrente: LegaVoce
  altre: LegaVoce[]
  organizzatore: boolean
  titolare?: boolean
  ospite?: boolean
}) {
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
        <span className="truncate font-semibold">{pending ? 'Cambio lega…' : corrente.nome}</span>
        {!pending && corrente.organizzatore && <Admin />}
        <span className="text-xs text-zinc-500" aria-hidden>
          ▾
        </span>
      </button>
      {ospite && (
        <span className="ml-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
          👑 Super admin
        </span>
      )}

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
                  <span className="min-w-0 flex-1 truncate">{l.nome}</span>
                  {l.organizzatore && <Admin />}
                </button>
              ))}
              <hr className="my-2 border-zinc-200 dark:border-zinc-800" />
            </>
          )}
          {organizzatore && (
            <Link href="/lega" role="menuitem" className={voce} onClick={() => setOpen(false)}>
              ⚙️ Impostazioni lega
            </Link>
          )}
          {titolare && (
            <Link href="/leghe" role="menuitem" className={voce} onClick={() => setOpen(false)}>
              👑 Tutte le leghe
            </Link>
          )}
          <Link href="/benvenuto" role="menuitem" className={voce} onClick={() => setOpen(false)}>
            ➕ Crea o entra in una lega
          </Link>
          {/* I tornei sono una sezione a sé: quelli di tutte le mie leghe, non solo della lega attiva */}
          <hr className="my-2 border-zinc-200 dark:border-zinc-800" />
          <Link href="/tornei" role="menuitem" className={`${voce} font-semibold`} onClick={() => setOpen(false)}>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center">🏆</span>
            <span className="flex-1">I miei tornei</span>
            <span className="text-xs font-normal text-zinc-400">tutte le leghe</span>
          </Link>
          <Link href="/pro" role="menuitem" className={`${voce} font-semibold`} onClick={() => setOpen(false)}>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center">
              <LogoC />
            </span>
            <span className="flex-1">The Cap Pro</span>
            <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-zinc-900">PRO</span>
          </Link>
        </div>
      )}
    </div>
  )
}
