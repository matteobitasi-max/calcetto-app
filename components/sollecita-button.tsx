'use client'

import { useActionState } from 'react'
import type { AvvisoState } from '@/app/actions'
import { buttonClass } from './ui-classes'
import { useT } from './lingua'

// "Sollecita": notifica a chi non ha ancora pagato e dice a quanti è arrivata.
export function SollecitaButton({ action, quanti }: { action: () => Promise<AvvisoState>; quanti: number }) {
  const t = useT()
  const [state, run, pending] = useActionState(() => action(), undefined)
  return (
    <form action={run} className="space-y-2">
      <button
        type="submit"
        disabled={pending || quanti === 0}
        className={buttonClass('secondary')}
        onClick={(e) => {
          if (!window.confirm(t.n(quanti, 'Mandare un promemoria a {n} giocatore?', 'Mandare un promemoria a {n} giocatori?'))) e.preventDefault()
        }}
      >
        {pending ? t('Invio…') : `🔔 ${t('Sollecita ({n})', { n: quanti })}`}
      </button>
      {state && (
        <p className="text-xs text-zinc-500">
          {state.error ??
            (state.totali
              ? t.n(state.inviate ?? 0, 'Promemoria arrivato su {n} dispositivo.', 'Promemoria arrivato su {n} dispositivi.')
              : t('Nessuno di loro ha le notifiche attive: scrivigli su WhatsApp.'))}
        </p>
      )}
    </form>
  )
}
