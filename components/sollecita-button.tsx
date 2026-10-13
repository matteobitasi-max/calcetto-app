'use client'

import { useActionState } from 'react'
import type { AvvisoState } from '@/app/actions'
import { buttonClass } from './ui-classes'

// "Sollecita": notifica a chi non ha ancora pagato e dice a quanti è arrivata.
export function SollecitaButton({ action, quanti }: { action: () => Promise<AvvisoState>; quanti: number }) {
  const [state, run, pending] = useActionState(() => action(), undefined)
  return (
    <form action={run} className="space-y-2">
      <button
        type="submit"
        disabled={pending || quanti === 0}
        className={buttonClass('secondary')}
        onClick={(e) => {
          if (!window.confirm(`Mandare un promemoria a ${quanti} giocator${quanti === 1 ? 'e' : 'i'}?`)) e.preventDefault()
        }}
      >
        {pending ? 'Invio…' : `🔔 Sollecita (${quanti})`}
      </button>
      {state && (
        <p className="text-xs text-zinc-500">
          {state.error ?? (state.totali ? `Promemoria arrivato su ${state.inviate} dispositiv${state.inviate === 1 ? 'o' : 'i'}.` : 'Nessuno di loro ha le notifiche attive: scrivigli su WhatsApp.')}
        </p>
      )}
    </form>
  )
}
