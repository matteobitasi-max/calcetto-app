'use client'

import { useState, useSyncExternalStore, type ReactNode } from 'react'
import { useT } from './lingua'
import { COOKIE_MODO, type Modo } from '@/lib/modo'

const leggi = (): Modo | null => {
  const v = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_MODO}=([^;]*)`))?.[1]
  return v === 'centro' || v === 'giocatore' ? v : null
}
const salva = (modo: Modo) => {
  document.cookie = `${COOKIE_MODO}=${modo}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
}

// Prima dell'accesso: "Giocatore / Allenatore" (leghe, squadre, tornei) o "Centro sportivo" (gestionale).
// La scelta resta su questo dispositivo: dopo l'accesso si apre la parte giusta (si cambia dal menu).
export function SceltaProfilo({ children }: { children: ReactNode }) {
  const t = useT()
  const salvato = useSyncExternalStore(
    () => () => {},
    leggi,
    () => null,
  )
  const [scelto, setScelto] = useState<Modo | null>(null)
  const modo = scelto ?? salvato

  const scegli = (m: Modo) => {
    salva(m)
    setScelto(m)
  }

  if (!modo) {
    return (
      <div className="w-full max-w-sm space-y-3">
        <p className="text-center text-sm font-semibold uppercase tracking-wide text-zinc-500">{t('Come usi The Cap?')}</p>
        <button
          type="button"
          onClick={() => scegli('giocatore')}
          className="flex w-full items-center gap-4 rounded-2xl border-2 border-green-600 bg-white p-4 text-left shadow-sm transition hover:bg-green-50 active:scale-[0.99] dark:bg-zinc-900 dark:hover:bg-green-950"
        >
          <span className="text-4xl">⚽</span>
          <span>
            <span className="block text-lg font-bold">{t('Giocatore / Allenatore')}</span>
            <span className="block text-sm text-zinc-500">{t('Leghe con gli amici, squadre, convocazioni e tornei')}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => scegli('centro')}
          className="flex w-full items-center gap-4 rounded-2xl border-2 border-orange-500 bg-white p-4 text-left shadow-sm transition hover:bg-orange-50 active:scale-[0.99] dark:bg-zinc-900 dark:hover:bg-orange-950"
        >
          <span className="text-4xl">🏟️</span>
          <span>
            <span className="block text-lg font-bold">{t('Centro sportivo')}</span>
            <span className="block text-sm text-zinc-500">{t('Planning dei campi, prenotazioni, incassi e statistiche')}</span>
          </span>
        </button>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <p className="text-sm text-zinc-500">
        {modo === 'centro' ? `🏟️ ${t('Accesso per il centro sportivo')}` : `⚽ ${t('Accesso per giocatori e allenatori')}`}
        {' · '}
        <button
          type="button"
          onClick={() => {
            const altro = modo === 'centro' ? 'giocatore' : 'centro'
            salva(altro)
            setScelto(altro)
          }}
          className="font-semibold text-green-700 hover:underline dark:text-green-400"
        >
          {t('cambia')}
        </button>
      </p>
      {children}
    </div>
  )
}
