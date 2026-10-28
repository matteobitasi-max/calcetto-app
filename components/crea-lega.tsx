'use client'

import { useActionState, useState } from 'react'
import { creaLega } from '@/app/actions'
import { buttonClass, inputClass } from './ui-classes'
import { useT } from '@/components/lingua'

// "Crea una lega": nome (obbligatorio) e città (facoltativa, per il meteo).
// Il pulsante si attiva con il nome; creata la lega, si apre subito (in home c'è l'invito per gli amici).
export function CreaLega() {
  const t = useT()
  const [esito, crea, pending] = useActionState(creaLega, undefined)
  const [nome, setNome] = useState('')

  return (
    <form action={crea} className="space-y-3">
      <input
        name="nome"
        required
        minLength={2}
        maxLength={40}
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder={t('Nome della lega, es. Calcetto del giovedì')}
        className={inputClass}
      />
      <input name="citta" maxLength={60} placeholder={t('Città (facoltativa, per il meteo), es. Milano')} className={inputClass} />
      <button type="submit" disabled={pending || nome.trim().length < 2} className={`${buttonClass('primary')} w-full justify-center disabled:opacity-50`}>
        {pending ? t('Creo…') : t('Crea la lega')}
      </button>
      {esito?.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{esito.error}</p>}
    </form>
  )
}
