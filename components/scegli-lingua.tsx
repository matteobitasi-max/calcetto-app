'use client'

import { useTransition } from 'react'
import { scegliLingua } from '@/app/actions'
import { LINGUE, type Lingua } from '@/lib/i18n'
import { useT } from './lingua'

// Scelta della lingua nel profilo: si applica subito a tutta l'app.
export function ScegliLingua() {
  const t = useT()
  const [pending, startTransition] = useTransition()
  return (
    <div className="flex gap-2" role="radiogroup" aria-label={t('Lingua')}>
      {(Object.keys(LINGUE) as Lingua[]).map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={t.lingua === l}
          disabled={pending}
          onClick={() => startTransition(() => scegliLingua(l))}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-semibold ${
            t.lingua === l ? 'border-green-600 bg-green-50 dark:bg-green-950' : 'border-zinc-200 dark:border-zinc-700'
          }`}
        >
          <span className="text-lg">{LINGUE[l].bandiera}</span> {LINGUE[l].nome}
        </button>
      ))}
    </div>
  )
}
