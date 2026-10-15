'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { creaLega } from '@/app/actions'
import { buttonClass, inputClass } from './ui-classes'

// "Crea una lega": nome (obbligatorio) e città (facoltativa, per il meteo).
// Il pulsante si attiva con il nome; creata la lega, compare l'invito da mandare su WhatsApp.
export function CreaLega() {
  const [esito, crea, pending] = useActionState(creaLega, undefined)
  const [nome, setNome] = useState('')

  if (esito?.creata) {
    const testo = `⚽ Entra nella lega "${esito.creata.nome}" su The Cap:\n${esito.creata.invito}`
    return (
      <div className="space-y-3 text-center">
        <p className="font-semibold">✅ “{esito.creata.nome}” è pronta!</p>
        <p className="text-sm text-zinc-500">Ora invita i tuoi amici: chi apre il link entra subito nella lega.</p>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(testo)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`${buttonClass('primary')} w-full justify-center`}
        >
          💬 Invita su WhatsApp
        </a>
        <Link href="/" className="block text-sm font-medium text-green-700 hover:underline dark:text-green-400">
          Entra nella lega →
        </Link>
      </div>
    )
  }

  return (
    <form action={crea} className="space-y-3">
      <input
        name="nome"
        required
        minLength={2}
        maxLength={40}
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Nome della lega, es. Calcetto del giovedì"
        className={inputClass}
      />
      <input name="citta" maxLength={60} placeholder="Città (facoltativa, per il meteo), es. Milano" className={inputClass} />
      <button type="submit" disabled={pending || nome.trim().length < 2} className={`${buttonClass('primary')} w-full justify-center disabled:opacity-50`}>
        {pending ? 'Creo…' : 'Crea la lega'}
      </button>
      {esito?.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{esito.error}</p>}
    </form>
  )
}
