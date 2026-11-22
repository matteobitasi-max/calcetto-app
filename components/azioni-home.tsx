'use client'

import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useT } from './lingua'
import { CodiceInvito, InvitoLink } from './invito-link'
import { ScriviSquadra } from './scrivi-squadra'

// In alto a destra nella home: ＋ apre l'invito per gli amici (link e codice), il megafono il messaggio alla squadra.
// Al posto dei due riquadri a tendina: la home resta pulita, le azioni sono sempre a un tocco.
export function AzioniHome({ invito, scrivi }: { invito?: { url: string; nomeLega: string; codice: string }; scrivi?: boolean }) {
  const t = useT()
  const [aperta, setAperta] = useState<'invito' | 'scrivi' | null>(null)
  if (!invito && !scrivi) return null
  const tondo = 'flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg font-bold shadow ring-1 ring-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:ring-zinc-700 dark:hover:bg-zinc-800'

  return (
    // -mb-4: nella home (space-y-6) la riga dei pulsanti sta vicina a quello che segue (la prossima partita)
    <div className="-mb-4 flex justify-end gap-2">
      {scrivi && (
        <button type="button" onClick={() => setAperta('scrivi')} aria-haspopup="dialog" aria-label={t('Scrivi alla squadra')} title={t('Scrivi alla squadra')} className={tondo}>
          📣
        </button>
      )}
      {invito && (
        <button
          type="button"
          onClick={() => setAperta('invito')}
          aria-haspopup="dialog"
          aria-label={t('Invita amici nella lega')}
          title={t('Invita amici nella lega')}
          className={`${tondo} text-green-700 dark:text-green-400`}
        >
          ＋
        </button>
      )}
      {aperta === 'invito' && invito && (
        <Finestra titolo={`📨 ${t('Invita amici nella lega')}`} chiudi={() => setAperta(null)}>
          <p className="text-sm text-zinc-500">{t('Chi apre il link e fa l’accesso entra subito nella rosa.')}</p>
          <InvitoLink url={invito.url} nomeLega={invito.nomeLega} />
          <CodiceInvito codice={invito.codice} />
        </Finestra>
      )}
      {aperta === 'scrivi' && scrivi && (
        <Finestra titolo={`📣 ${t('Scrivi alla squadra')}`} chiudi={() => setAperta(null)}>
          <ScriviSquadra />
        </Finestra>
      )}
    </div>
  )
}

function Finestra({ titolo, chiudi, children }: { titolo: string; chiudi: () => void; children: ReactNode }) {
  const t = useT()
  return createPortal(
    <div
      role="dialog"
      aria-label={titolo}
      onClick={(e) => e.target === e.currentTarget && chiudi()}
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 pb-[max(1rem,var(--safe-area-inset-bottom,env(safe-area-inset-bottom)))] sm:items-center"
    >
      <div className="max-h-[85vh] w-full max-w-md space-y-3 overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">{titolo}</h2>
          <button type="button" onClick={chiudi} aria-label={t('Chiudi')} className="rounded-lg px-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
