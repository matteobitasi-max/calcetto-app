'use client'

import { useActionState } from 'react'
import { eliminaAccount } from '@/app/actions'

// "Elimina account" nel profilo, con doppia conferma.
export function EliminaAccount() {
  const [state, elimina, pending] = useActionState(eliminaAccount, undefined)
  return (
    <form
      action={elimina}
      onSubmit={(e) => {
        if (!window.confirm("Eliminare il tuo account? Verranno cancellati accesso, foto e dati personali in tutte le leghe. Non si torna indietro.")) {
          e.preventDefault()
        }
      }}
      className="space-y-2 text-center"
    >
      <button type="submit" disabled={pending} className="text-sm text-red-600 hover:underline disabled:opacity-50">
        {pending ? 'Elimino…' : 'Elimina account'}
      </button>
      {state?.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{state.error}</p>}
    </form>
  )
}
