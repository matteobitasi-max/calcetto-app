'use client'

import { useState } from 'react'
import { Card } from './ui-base'
import { buttonClass } from './ui-classes'
import { useT } from './lingua'

// Il tasto nel Calendario: il calendario del telefono si abbona al mio link e da lì le partite
// compaiono e si aggiornano da sole. iPhone e Mac aprono il link webcal://, Android passa da Google Calendar.
export function AggiungiCalendario({ percorso }: { percorso: string }) {
  const t = useT()
  const [aperto, setAperto] = useState(false)
  const [copiato, setCopiato] = useState(false)

  if (!aperto) {
    return (
      <button type="button" onClick={() => setAperto(true)} className={`${buttonClass('secondary')} w-full`}>
        📅 {t('Aggiungi le partite al calendario del telefono')}
      </button>
    )
  }

  // si apre solo dopo un tocco, quindi qui siamo già nel browser
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
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-semibold">📅 {t('Partite nel calendario del telefono')}</h2>
        <button type="button" onClick={() => setAperto(false)} aria-label={t('Chiudi')} className="rounded-lg px-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
          ✕
        </button>
      </div>
      <p className="text-sm text-zinc-500">
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
      <p className="text-xs text-zinc-500">{t('Il link è personale: non condividerlo.')}</p>
    </Card>
  )
}
