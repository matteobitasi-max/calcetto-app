'use client'

import { useState, useTransition } from 'react'
import { salvaPreferenzaNotifica } from '@/app/actions'
import { CATEGORIE_NOTIFICHE, type CategoriaNotifica } from '@/lib/roster'
import { useT } from '@/components/lingua'

// Interruttori per scegliere quali notifiche ricevere: si salvano subito.
export function PreferenzeNotifiche({ iniziali }: { iniziali?: Partial<Record<CategoriaNotifica, boolean>> }) {
  const t = useT()
  const [valori, setValori] = useState(iniziali ?? {})
  const [, startTransition] = useTransition()

  return (
    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
      {(Object.entries(CATEGORIE_NOTIFICHE) as [CategoriaNotifica, (typeof CATEGORIE_NOTIFICHE)[CategoriaNotifica]][]).map(([chiave, c]) => {
        const attiva = valori[chiave] !== false
        return (
          <li key={chiave}>
            <label className="flex cursor-pointer items-center justify-between gap-3 py-3 text-sm">
              <span>
                {c.emoji} {t(c.label)}
              </span>
              <input
                type="checkbox"
                role="switch"
                checked={attiva}
                onChange={(e) => {
                  const nuovo = e.target.checked
                  setValori((v) => ({ ...v, [chiave]: nuovo }))
                  startTransition(() =>
                    salvaPreferenzaNotifica(chiave, nuovo).catch(() => setValori((v) => ({ ...v, [chiave]: !nuovo }))),
                  )
                }}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className="relative h-6 w-11 shrink-0 rounded-full bg-zinc-300 transition peer-checked:bg-green-600 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5 dark:bg-zinc-700"
              />
            </label>
          </li>
        )
      })}
    </ul>
  )
}
