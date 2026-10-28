'use client'

import { useActionState, useState } from 'react'
import type { FormState } from '@/app/actions'
import { buttonClass, inputClass } from './ui-classes'
import { useT } from './lingua'

// Nel profilo, per chi organizza più leghe: porta il giocatore in un'altra lega (togliendolo da questa o no).
export function SpostaGiocatore({
  nome,
  leghe,
  azione,
}: {
  nome: string
  leghe: { id: string; nome: string }[]
  azione: (prev: FormState, fd: FormData) => Promise<FormState>
}) {
  const t = useT()
  const [aperto, setAperto] = useState(false)
  const [esito, invia, pending] = useActionState(azione, undefined)
  const [modo, setModo] = useState<'sposta' | 'aggiungi'>('sposta')

  if (!aperto) {
    return (
      <button type="button" onClick={() => setAperto(true)} className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800">
        <span>
          <span className="block font-semibold">↔️ {t('Sposta in un’altra lega')}</span>
          <span className="block text-sm text-zinc-500">{t('Porta {nome} in un’altra delle leghe che organizzi', { nome })}</span>
        </span>
        <span className="text-zinc-400">›</span>
      </button>
    )
  }

  const fatto = esito && !esito.error
  return (
    <form action={invia} className="space-y-3 p-4">
      <h2 className="font-semibold">↔️ {t('Sposta in un’altra lega')}</h2>
      <select name="lega" required defaultValue="" className={inputClass}>
        <option value="" disabled>
          {t('Scegli la lega')}
        </option>
        {leghe.map((l) => (
          <option key={l.id} value={l.id}>
            {l.nome}
          </option>
        ))}
      </select>
      <div className="grid gap-2">
        {(
          [
            ['sposta', 'Sposta', 'Esce da questa lega (le partite giocate restano qui)'],
            ['aggiungi', 'Aggiungi anche lì', 'Resta in tutte e due le leghe'],
          ] as const
        ).map(([valore, titolo, sotto]) => (
          <label
            key={valore}
            className={`cursor-pointer rounded-xl border-2 p-3 ${modo === valore ? 'border-green-600 bg-green-50 dark:bg-green-950' : 'border-zinc-200 dark:border-zinc-800'}`}
          >
            <input type="radio" name="modo" value={valore} checked={modo === valore} onChange={() => setModo(valore)} className="sr-only" />
            <span className="block font-semibold">{t(titolo)}</span>
            <span className="block text-xs text-zinc-500">{t(sotto)}</span>
          </label>
        ))}
      </div>
      <p className="text-xs text-zinc-500">{t('Porta con sé dati, foto e caratteristiche. Se era già in quella lega, ritrova la sua scheda.')}</p>
      {esito?.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{esito.error}</p>}
      {fatto && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-300">✓ {t('Fatto: {nome} ora è anche nell’altra lega.', { nome })}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={`${buttonClass('primary')} flex-1 justify-center disabled:opacity-50`}>
          {pending ? '…' : modo === 'sposta' ? t('Sposta') : t('Aggiungi')}
        </button>
        <button type="button" onClick={() => setAperto(false)} className={buttonClass('secondary')}>
          {t('Chiudi')}
        </button>
      </div>
    </form>
  )
}
