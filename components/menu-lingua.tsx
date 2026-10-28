'use client'

import { useTransition } from 'react'
import { scegliLingua } from '@/app/actions'
import { LINGUE, type Lingua } from '@/lib/i18n'
import { useT } from './lingua'

// La lingua in un menu a tendina (schermata di accesso): si applica subito, anche alle pagine di Clerk.
export function MenuLingua() {
  const t = useT()
  const [pending, startTransition] = useTransition()
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{t('Lingua')}</span>
      <select
        value={t.lingua}
        disabled={pending}
        onChange={(e) => {
          const l = e.target.value
          startTransition(() => scegliLingua(l))
        }}
        className="appearance-none rounded-full border border-zinc-200 bg-white py-1.5 pl-3 pr-8 text-sm font-medium shadow-sm disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900"
      >
        {(Object.keys(LINGUE) as Lingua[]).map((l) => (
          <option key={l} value={l}>
            {LINGUE[l].bandiera} {LINGUE[l].nome}
          </option>
        ))}
      </select>
      <span aria-hidden className="pointer-events-none absolute right-3 text-xs text-zinc-500">
        ▾
      </span>
    </label>
  )
}
