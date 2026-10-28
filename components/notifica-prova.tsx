'use client'

import { useState, useTransition } from 'react'
import { notificaDiProva } from '@/app/actions'
import { useT } from './lingua'

// "Mandami una notifica di prova": arriva a tutti i miei dispositivi con le notifiche attive.
export function NotificaProva() {
  const t = useT()
  const [esito, setEsito] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await notificaDiProva()
            setEsito(
              'error' in r
                ? r.error
                : r.totali === 0
                  ? t('Nessun dispositivo con le notifiche attive: attivale qui sopra, poi riprova.')
                  : t('Inviata a {n} dispositivi su {tot}: dovrebbe arrivare tra pochi secondi.', { n: r.inviate, tot: r.totali }),
            )
          })
        }
        className="text-sm font-medium text-green-700 hover:underline disabled:opacity-50 dark:text-green-400"
      >
        {pending ? '…' : `📨 ${t('Mandami una notifica di prova')}`}
      </button>
      {esito && <p className="text-xs text-zinc-500">{esito}</p>}
    </div>
  )
}
