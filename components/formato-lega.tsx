'use client'

import { useActionState, useState } from 'react'
import type { FormState } from '@/app/actions'
import { FORMATI, MODULI, moduloPer, type Formato } from '@/lib/moduli'
import { useT } from './lingua'
import { buttonClass, inputClass } from './ui-classes'

// Club: formato di gioco della lega (calcio a 5…11) e modulo preferito, proposto in ogni nuova formazione.
export function FormatoLega({ azione, formato, modulo }: { azione: (prev: FormState, fd: FormData) => Promise<FormState>; formato: Formato; modulo?: string }) {
  const t = useT()
  const [stato, invia, invio] = useActionState(azione, undefined)
  const [f, setF] = useState<Formato>(formato)
  const [m, setM] = useState(moduloPer(formato, modulo))
  const cambiato = f !== formato || m !== moduloPer(formato, modulo)
  return (
    <form action={invia} className="space-y-2 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-950">
      <p className="text-sm font-semibold">⚽ {t('Formato e modulo')}</p>
      <p className="text-xs text-zinc-500">{t('Il modulo preferito si usa in ogni nuova formazione; in ogni partita lo puoi cambiare.')}</p>
      <div className="grid grid-cols-2 gap-2">
        <select
          name="formato"
          value={f}
          onChange={(e) => {
            const nuovo = Number(e.target.value) as Formato
            setF(nuovo)
            setM(MODULI[nuovo][0])
          }}
          aria-label={t('Formato')}
          className={inputClass}
        >
          {FORMATI.map((n) => (
            <option key={n} value={n}>
              {t('Calcio a {n}', { n })}
            </option>
          ))}
        </select>
        <select name="modulo" value={m} onChange={(e) => setM(e.target.value)} aria-label={t('Modulo preferito')} className={inputClass}>
          {MODULI[f].map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
      </div>
      {stato?.error && <p className="text-sm text-red-600 dark:text-red-400">{stato.error}</p>}
      {cambiato && (
        <button type="submit" disabled={invio} className={`${buttonClass('primary')} w-full`}>
          {invio ? t('Salvo…') : t('Salva')}
        </button>
      )}
    </form>
  )
}
