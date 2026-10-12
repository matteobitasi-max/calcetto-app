'use client'

import { useActionState } from 'react'
import type { AvvisoState } from '@/app/actions'
import { buttonClass } from './ui-classes'

// Pulsante dell'organizzatore: apre le convocazioni e manda la notifica push,
// poi propone il messaggio già scritto per il gruppo WhatsApp.
export function ApriConvocazioni({
  action,
  label,
  whatsappUrl,
  conferma,
}: {
  action: () => Promise<AvvisoState>
  label: string
  whatsappUrl: string
  conferma: string
}) {
  const [state, run, pending] = useActionState(() => action(), undefined)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <form action={run}>
          <button
            type="submit"
            disabled={pending}
            className={buttonClass('primary')}
            onClick={(e) => {
              if (!window.confirm(conferma)) e.preventDefault()
            }}
          >
            {pending ? 'Invio…' : label}
          </button>
        </form>
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={`${buttonClass('secondary')} text-green-700 dark:text-green-400`}>
          💬 Manda su WhatsApp
        </a>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state && !state.error && (
        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-300">
          {state.totali
            ? `Notifica inviata su ${state.inviate} dispositiv${state.inviate === 1 ? 'o' : 'i'} su ${state.totali}.`
            : 'Nessuno ha ancora attivato le notifiche.'}{' '}
          Per avvisare anche gli altri, manda il messaggio nel gruppo WhatsApp.
        </p>
      )}
    </div>
  )
}
