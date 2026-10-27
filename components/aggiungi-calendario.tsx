'use client'

import { useState } from 'react'
import { Card } from './ui-base'
import { buttonClass } from './ui-classes'
import { useT } from './lingua'

// L'icona nel riquadro del Calendario: il calendario del telefono si abbona al mio link e da lì le partite
// compaiono e si aggiornano da sole. iPhone e Mac aprono il link webcal://, Android passa da Google Calendar.
export function AggiungiCalendario({ percorso }: { percorso: string }) {
  const t = useT()
  const [aperto, setAperto] = useState(false)
  const [copiato, setCopiato] = useState(false)

  const icona = (
    <button
      type="button"
      onClick={() => setAperto((x) => !x)}
      aria-label={t('Aggiungi le partite al calendario del telefono')}
      aria-expanded={aperto}
      title={t('Aggiungi le partite al calendario del telefono')}
      className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-green-700 dark:hover:bg-zinc-800 dark:hover:text-green-400"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18M12 13v5M9.5 15.5h5" />
      </svg>
    </button>
  )
  if (!aperto) return icona

  // le opzioni si vedono solo dopo un tocco, quindi lì siamo già nel browser
  const android = /Android/i.test(navigator.userAgent)
  const link = () => `${window.location.origin}${percorso}`
  const webcal = () => link().replace(/^https?:/, 'webcal:')
  const google = () => `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal())}`
  const apple = (
    <button key="apple" type="button" onClick={() => (window.location.href = webcal())} className={`${buttonClass(android ? 'secondary' : 'primary')} w-full`}>
      {t('iPhone, iPad, Mac')}
    </button>
  )
  const gcal = (
    <button key="google" type="button" onClick={() => window.open(google(), '_blank')} className={`${buttonClass(android ? 'primary' : 'secondary')} w-full`}>
      Google Calendar
    </button>
  )

  return (
    <span className="relative">
      {icona}
      {/* toccando fuori si chiude */}
      <button type="button" aria-label={t('Chiudi')} onClick={() => setAperto(false)} className="fixed inset-0 z-10 cursor-default" />
      <Card className="absolute left-1/2 top-full z-20 mt-2 w-72 -translate-x-1/2 space-y-3 text-left shadow-xl">
        <h2 className="font-semibold">📅 {t('Partite nel calendario del telefono')}</h2>
        <p className="text-sm font-normal text-zinc-500">
          {t('Le partite di tutte le tue leghe compaiono nel calendario del telefono, con un promemoria 2 ore prima. Se una partita viene spostata o annullata, il calendario si aggiorna da solo.')}
        </p>
        <div className="space-y-2">{android ? [gcal, apple] : [apple, gcal]}</div>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(link())
            setCopiato(true)
          }}
          className="w-full text-center text-sm font-medium text-green-700 hover:underline dark:text-green-400"
        >
          {copiato ? `✓ ${t('Link copiato')}` : t('Altro calendario (Outlook…): copia il link')}
        </button>
        <p className="text-xs font-normal text-zinc-500">{t('Il link è personale: non condividerlo.')}</p>
      </Card>
    </span>
  )
}
