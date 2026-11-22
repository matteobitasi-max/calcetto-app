'use client'

import Link from 'next/link'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '@/components/lingua'

// "Cosa vuoi organizzare?": partita, allenamento o torneo (Pro). Dal calendario arriva con il giorno
// già scelto e, se organizzo una sola lega tra quelle in vista, la lega; con più leghe si sceglie dopo.
export function SceltaNuovo({ chiudi, giorno, lega, scegliLega }: { chiudi: () => void; giorno?: string; lega?: string; scegliLega?: boolean }) {
  const t = useT()
  const q = (extra = '') => {
    const p = new URLSearchParams()
    if (giorno) p.set('giorno', giorno)
    if (lega) p.set('lega', lega)
    else if (scegliLega) p.set('scegli', '1')
    const s = p.toString()
    return s || extra ? `?${[s, extra].filter(Boolean).join('&')}` : ''
  }
  const voce = 'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800'

  return createPortal(
    <div
      role="dialog"
      aria-label={t('Cosa vuoi organizzare?')}
      onClick={(e) => e.target === e.currentTarget && chiudi()}
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 pb-[max(1rem,var(--safe-area-inset-bottom,env(safe-area-inset-bottom)))] sm:items-center"
    >
      <div className="w-full max-w-sm space-y-1 rounded-2xl bg-white p-3 shadow-2xl dark:bg-zinc-900">
        <p className="px-4 pb-1 pt-1 font-semibold">{t('Cosa vuoi organizzare?')}</p>
        <Link href={`/partite/nuova${q()}`} className={voce} onClick={chiudi}>
          <span className="text-2xl">⚽</span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{t('Partita')}</span>
            <span className="block text-xs text-zinc-500">{t('Singola o ricorrente, con le convocazioni')}</span>
          </span>
        </Link>
        <Link href={`/partite/nuova${q('tipo=allenamento')}`} className={voce} onClick={chiudi}>
          <span className="text-2xl">🏃</span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{t('Allenamento')}</span>
            <span className="block text-xs text-zinc-500">{t('Con le convocazioni, senza squadre né risultato')}</span>
          </span>
        </Link>
        <Link href={`/tornei/nuovo${q()}`} className={voce} onClick={chiudi}>
          <span className="text-2xl">🏆</span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{t('Torneo')}</span>
            <span className="block text-xs text-zinc-500">{t('Squadre fisse, girone e classifica')}</span>
          </span>
          <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-zinc-900">PRO</span>
        </Link>
        <button type="button" onClick={chiudi} className="w-full py-2 text-sm text-zinc-500">
          {t('Annulla')}
        </button>
      </div>
    </div>,
    document.body,
  )
}

// Nel giorno toccato del calendario: "＋ Nuovo" apre la stessa scelta, con il giorno già impostato.
export function NuovoNelGiorno({ giorno, lega, scegliLega }: { giorno: string; lega?: string; scegliLega?: boolean }) {
  const t = useT()
  const [aperta, setAperta] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setAperta(true)}
        aria-haspopup="dialog"
        className="rounded-full bg-green-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-green-700"
      >
        ＋ {t('Nuovo')}
      </button>
      {aperta && <SceltaNuovo chiudi={() => setAperta(false)} giorno={giorno} lega={lega} scegliLega={scegliLega} />}
    </>
  )
}
