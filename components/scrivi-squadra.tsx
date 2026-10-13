'use client'

import { useActionState, useState } from 'react'
import { inviaComunicazione, type AvvisoState } from '@/app/actions'
import { buttonClass, inputClass } from './ui-classes'

// "Scrivi alla squadra": il capitano (o un organizzatore) manda una comunicazione a tutti.
export function ScriviSquadra() {
  const [testo, setTesto] = useState('')
  const [state, invia, pending] = useActionState(async (prev: AvvisoState, fd: FormData) => {
    const r = await inviaComunicazione(prev, fd)
    if (!r?.error) setTesto('')
    return r
  }, undefined)

  return (
    <details className="group rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
        📢 Scrivi alla squadra
        <span className="text-zinc-400 transition group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>
      <form action={invia} className="space-y-2 border-t border-zinc-200 p-4 dark:border-zinc-800">
        <textarea
          name="testo"
          rows={3}
          maxLength={300}
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          placeholder="Es. Stasera portate le pettorine scure 💪"
          className={inputClass}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-zinc-400">{testo.length}/300</span>
          <button type="submit" disabled={pending || testo.trim().length < 2} className={buttonClass('primary')}>
            {pending ? 'Invio…' : 'Invia a tutti'}
          </button>
        </div>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state && !state.error && (
          <p className="text-sm text-green-700 dark:text-green-400">
            ✓ Inviata{state.totali ? ` su ${state.inviate} dispositiv${state.inviate === 1 ? 'o' : 'i'}` : ''}.
            {!state.totali && ' Nessuno ha le notifiche attive per le comunicazioni: scrivi anche su WhatsApp.'}
          </p>
        )}
      </form>
    </details>
  )
}
