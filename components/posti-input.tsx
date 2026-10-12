'use client'

import { useState } from 'react'
import { inputClass } from './ui-classes'
import { MAX_GIOCATORI } from '@/lib/limiti'

const PRESET = [
  [10, '5 vs 5'],
  [12, '6 vs 6'],
  [14, '7 vs 7'],
] as const

// Numero di giocatori in lista: scorciatoie per i formati più comuni o valore libero.
export function PostiInput({ defaultValue = 10 }: { defaultValue?: number }) {
  const [value, setValue] = useState(defaultValue)
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {PRESET.map(([n, label]) => (
          <button
            key={n}
            type="button"
            onClick={() => setValue(n)}
            className={`rounded-full border px-3 py-1 text-sm ${
              value === n
                ? 'border-green-600 bg-green-600 text-white'
                : 'border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800'
            }`}
          >
            {n} · {label}
          </button>
        ))}
      </div>
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
    </div>
  )
}
