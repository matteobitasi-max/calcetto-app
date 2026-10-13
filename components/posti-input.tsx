'use client'

import { useState } from 'react'
import { inputClass } from './ui-classes'
import { MAX_GIOCATORI, MAX_ISCRITTI } from '@/lib/limiti'

const PRESET = [
  [10, '5 vs 5'],
  [12, '6 vs 6'],
  [14, '7 vs 7'],
] as const

const chip = (attivo: boolean) =>
  `rounded-full border px-3 py-1 text-sm ${
    attivo ? 'border-green-600 bg-green-600 text-white' : 'border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800'
  }`

// Numero di giocatori in lista: deciso dalle convocazioni (pari alla chiusura),
// oppure fisso con le scorciatoie per i formati più comuni o un valore libero.
export function PostiInput({ defaultValue = 10, defaultAutomatico = true }: { defaultValue?: number; defaultAutomatico?: boolean }) {
  const [automatico, setAutomatico] = useState(defaultAutomatico)
  const [value, setValue] = useState(defaultValue)
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setAutomatico(true)} className={chip(automatico)}>
          📋 In base alle convocazioni
        </button>
        {PRESET.map(([n, label]) => (
          <button
            key={n}
            type="button"
            onClick={() => {
              setAutomatico(false)
              setValue(n)
            }}
            className={chip(!automatico && value === n)}
          >
            {n} · {label}
          </button>
        ))}
      </div>
      {automatico ? (
        <>
          <input type="hidden" name="postiAutomatici" value="on" />
          <input type="hidden" name="postiDisponibili" value={MAX_ISCRITTI} />
          <p className="text-xs text-zinc-500">
            Si convoca chi vuole. Quando chiudi le convocazioni il numero diventa pari: 18 iscritti → 9 contro 9, 11 iscritti → 5
            contro 5 e l&apos;ultimo in lista d&apos;attesa.
          </p>
        </>
      ) : (
        <input
          name="postiDisponibili"
          type="number"
          min={2}
          max={Math.max(MAX_GIOCATORI, defaultValue)}
          required
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className={inputClass}
        />
      )}
    </div>
  )
}
