'use client'

import { useState, type ReactNode } from 'react'
import { useT } from './lingua'

// Le squadre della partita: sul campo (di default) o in elenco, a scelta.
export function VistaSquadre({ campo, elenco }: { campo: ReactNode; elenco: ReactNode }) {
  const t = useT()
  const [vista, setVista] = useState<'campo' | 'elenco'>('campo')
  const scheda = (v: typeof vista, etichetta: string) => (
    <button
      type="button"
      onClick={() => setVista(v)}
      aria-pressed={vista === v}
      className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
        vista === v ? 'bg-white text-zinc-900 shadow dark:bg-zinc-700 dark:text-white' : 'text-zinc-600 dark:text-zinc-400'
      }`}
    >
      {etichetta}
    </button>
  )
  return (
    <>
      <div className="flex gap-1 rounded-xl bg-zinc-200/80 p-1 shadow-inner dark:bg-zinc-800/80" role="group" aria-label={t('Come vedere le squadre')}>
        {scheda('campo', `⚽ ${t('Campo')}`)}
        {scheda('elenco', `📋 ${t('Elenco')}`)}
      </div>
      {vista === 'campo' ? campo : elenco}
    </>
  )
}
