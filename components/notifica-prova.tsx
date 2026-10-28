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
            if ('error' in r) return setEsito(r.error)
            if (r.dispositivi.length === 0) return setEsito(t('Nessun dispositivo con le notifiche attive: attivale qui sopra, poi riprova.'))
            const ok = r.dispositivi.filter((d) => d.esito === 'inviata').length
            setEsito(
              [
                t('Inviata a {n} dispositivi su {tot}: dovrebbe arrivare tra pochi secondi.', { n: ok, tot: r.dispositivi.length }),
                // il motivo tecnico, se un dispositivo non l'ha accettata (da mandare all'assistenza)
                ...r.dispositivi.filter((d) => d.esito !== 'inviata').map((d) => `⚠️ ${d.tipo}: ${d.esito}${d.motivo ? ` – ${d.motivo}` : ''}`),
              ].join('\n'),
            )
          })
        }
        className="text-sm font-medium text-green-700 hover:underline disabled:opacity-50 dark:text-green-400"
      >
        {pending ? '…' : `📨 ${t('Mandami una notifica di prova')}`}
      </button>
      {esito && <p className="whitespace-pre-line break-words text-xs text-zinc-500">{esito}</p>}
    </div>
  )
}
