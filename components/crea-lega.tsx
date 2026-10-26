'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { creaLega } from '@/app/actions'
import { buttonClass, inputClass } from './ui-classes'
import { useT } from '@/components/lingua'

// "Crea una lega": nome (obbligatorio) e città (facoltativa, per il meteo).
// Il pulsante si attiva con il nome; creata la lega, compare l'invito da mandare su WhatsApp.
export function CreaLega() {
  const t = useT()
  const [esito, crea, pending] = useActionState(creaLega, undefined)
  const [nome, setNome] = useState('')

  if (esito?.creata) {
    const testo = `⚽ ${t('Entra nella lega “{lega}” su The Cap:', { lega: esito.creata.nome })}\n${esito.creata.invito}`
    return (
      <div className="space-y-3 text-center">
        <p className="font-semibold">✅ {t('“{lega}” è pronta!', { lega: esito.creata.nome })}</p>
        <p className="text-sm text-zinc-500">{t('Ora invita i tuoi amici: chi apre il link entra subito nella lega.')}</p>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(testo)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`${buttonClass('primary')} w-full justify-center`}
        >
          💬 {t('Invita su WhatsApp')}
        </a>
        <Link href="/" className="block text-sm font-medium text-green-700 hover:underline dark:text-green-400">
          {t('Entra nella lega →')}
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
