'use client'

import { useActionState } from 'react'
import { eliminaAccount } from '@/app/actions'
import { confermaInvio } from '@/components/conferma'
import { useT } from '@/components/lingua'

// "Elimina account" nel profilo, con conferma.
export function EliminaAccount() {
  const t = useT()
  const [state, elimina, pending] = useActionState(eliminaAccount, undefined)
  return (
    <form action={elimina} className="space-y-2 text-center">
      <button
        type="submit"
        disabled={pending}
        onClick={(e) =>
          confermaInvio(e, {
            testo: t('Eliminare il tuo account? Verranno cancellati accesso, foto e dati personali in tutte le leghe. Se sei l’unico organizzatore di una lega, un altro giocatore della rosa diventerà organizzatore. Se hai The Cap Pro, disdici l’abbonamento dalle impostazioni di Apple o Google: eliminando l’account non si ferma. Non si torna indietro.'),
            ok: t('Elimina account'),
            pericolo: true,
          })
        }
        className="text-sm text-red-600 hover:underline disabled:opacity-50"
      >
        {pending ? t('Elimino…') : t('Elimina account')}
      </button>
      {state?.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{state.error}</p>}
    </form>
  )
}
