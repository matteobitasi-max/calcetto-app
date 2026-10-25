'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { inputClass } from '@/components/ui-classes'

// Tendina in cima al calendario: tutte le mie leghe (predefinito) o una sola.
export function FiltroLega({ leghe, scelta, mese }: { leghe: { id: string; nome: string }[]; scelta: string; mese: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  return (
    <select
      aria-label="Lega"
      value={scelta}
      disabled={pending}
      onChange={(e) => {
        const lega = e.target.value
        startTransition(() => router.replace(`/calendario?mese=${mese}${lega === 'tutte' ? '' : `&lega=${lega}`}`, { scroll: false }))
      }}
      className={`${inputClass} font-medium disabled:opacity-60`}
    >
      <option value="tutte">🌐 Tutte le mie leghe ({leghe.length})</option>
      {leghe.map((l) => (
        <option key={l.id} value={l.id}>
          {l.nome}
        </option>
      ))}
    </select>
  )
}
