'use client'

import { useActionState, useState } from 'react'
import { creaLega } from '@/app/actions'
import { buttonClass, inputClass } from './ui-classes'
import { useT } from '@/components/lingua'
import { EtichettaClub } from './pill-scelta'

// "Crea una lega": che tipo di lega (tra amici o Club Allenatore), nome (obbligatorio) e città (facoltativa, per il meteo).
// Il pulsante si attiva con il nome; creata la lega, si apre subito (in home c'è l'invito per gli amici).
// Con il Club, senza abbonamento si passa dalla pagina del Club PRO per attivarlo.
export function CreaLega() {
  const t = useT()
  const [esito, crea, pending] = useActionState(creaLega, undefined)
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<'amici' | 'club'>('amici')

  const scheda = (valore: 'amici' | 'club', emoji: string, titolo: string, testo: string, extra?: React.ReactNode) => (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 text-left ${
        tipo === valore ? 'border-green-600 bg-green-50 dark:bg-green-950' : 'border-zinc-200 dark:border-zinc-700'
      }`}
    >
      <input type="radio" name="tipo" value={valore} checked={tipo === valore} onChange={() => setTipo(valore)} className="sr-only" />
      <span className="text-2xl">{emoji}</span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2 font-semibold">
          {titolo}
          {extra}
        </span>
        <span className="block text-sm text-zinc-500">{testo}</span>
      </span>
      {tipo === valore && <span className="text-green-600">✓</span>}
    </label>
  )

  return (
    <form action={crea} className="space-y-3">
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">{t('Che lega vuoi creare?')}</legend>
        {scheda('amici', '👥', t('Lega tra amici'), t('Chi risponde per primo gioca, con la lista d’attesa. Gratis.'))}
        {scheda('club', '🧢', t('Club Allenatore'), t('Per squadre con allenatore: convocati scelti da te, infortunati, pagelle, formazione con modulo. Include tutto il Pro.'), <EtichettaClub />)}
      </fieldset>
      <input
        name="nome"
        required
        minLength={2}
        maxLength={40}
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder={tipo === 'club' ? t('Nome della squadra, es. ASD Real Giovedì') : t('Nome della lega, es. Calcetto del giovedì')}
        className={inputClass}
      />
      <input name="citta" maxLength={60} placeholder={t('Città (facoltativa, per il meteo), es. Milano')} className={inputClass} />
      <button type="submit" disabled={pending || nome.trim().length < 2} className={`${buttonClass('primary')} w-full justify-center disabled:opacity-50`}>
        {pending ? t('Creo…') : tipo === 'club' ? t('Crea il Club') : t('Crea la lega')}
      </button>
      {tipo === 'club' && <p className="text-xs text-zinc-500">{t('Se non hai ancora il Club PRO, dopo la creazione ti mostriamo come attivarlo. Puoi sempre cambiare tipo di lega dalle impostazioni.')}</p>}
      {esito?.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{esito.error}</p>}
    </form>
  )
}
