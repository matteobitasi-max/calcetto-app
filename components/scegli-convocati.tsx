'use client'

import { useActionState, useState } from 'react'
import type { FormState } from '@/app/actions'
import { useT } from './lingua'
import { buttonClass } from './ui-classes'

export type Candidato = { id: string; nome: string; ruolo?: string; indisponibile?: string; risposta?: 'presente' | 'assente' | 'riserva' }

// Leghe "Squadra": l'allenatore spunta i convocati. Gli indisponibili si vedono ma non si possono scegliere.
export function ScegliConvocati({
  azione,
  candidati,
  scelti,
}: {
  azione: (prev: FormState, fd: FormData) => Promise<FormState>
  candidati: Candidato[]
  scelti: string[]
}) {
  const t = useT()
  const [stato, invia, invio] = useActionState(azione, undefined)
  const [sel, setSel] = useState(() => new Set(scelti))
  const disponibili = candidati.filter((c) => !c.indisponibile)
  const cambia = (id: string) =>
    setSel((v) => {
      const n = new Set(v)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  return (
    <form action={invia} className="space-y-3 pb-24">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-zinc-500">{t('{n} convocati', { n: sel.size })}</span>
        <span className="flex gap-3">
          <button type="button" onClick={() => setSel(new Set(disponibili.map((c) => c.id)))} className="font-medium text-green-700 hover:underline dark:text-green-400">
            {t('Tutti i disponibili')}
          </button>
          <button type="button" onClick={() => setSel(new Set())} className="font-medium text-zinc-500 hover:underline">
            {t('Nessuno')}
          </button>
        </span>
      </div>

      {/* computer: due colonne, si sposta un giocatore toccandolo (le caselle sotto restano i campi del modulo) */}
      <div className="hidden gap-4 lg:grid lg:grid-cols-2">
        {(
          [
            [t('Disponibili'), candidati.filter((c) => !sel.has(c.id)), false],
            [t('Convocati'), candidati.filter((c) => sel.has(c.id)), true],
          ] as const
        ).map(([titolo, lista, convocati]) => (
          <div key={titolo} className={`rounded-xl border-2 bg-white p-3 dark:bg-zinc-900 ${convocati ? 'border-green-600' : 'border-zinc-200 dark:border-zinc-800'}`}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {titolo} ({lista.length})
            </p>
            <ul className="space-y-1">
              {lista.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    disabled={!!c.indisponibile}
                    onClick={() => cambia(c.id)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-zinc-50 disabled:opacity-50 dark:hover:bg-zinc-800"
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">{c.nome}</span>
                    <span className="text-xs text-zinc-500">{c.indisponibile ?? (c.ruolo ? t(c.ruolo) : '')}</span>
                    {!c.indisponibile && <span className={`text-lg ${convocati ? 'text-red-500' : 'text-green-600'}`}>{convocati ? '−' : '+'}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 lg:hidden">
        {candidati.map((c) => {
          const attivo = sel.has(c.id)
          return (
            <li key={c.id}>
              <label className={`flex items-center gap-3 px-4 py-3 ${c.indisponibile ? 'opacity-50' : 'cursor-pointer'}`}>
                <input
                  type="checkbox"
                  name="giocatore"
                  value={c.id}
                  checked={attivo}
                  disabled={!!c.indisponibile}
                  onChange={() => cambia(c.id)}
                  className="h-5 w-5 accent-green-600"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{c.nome}</span>
                  <span className="block text-xs text-zinc-500">
                    {c.indisponibile ?? (c.ruolo ? t(c.ruolo) : '')}
                    {!c.indisponibile && c.risposta === 'presente' && ` ${c.ruolo ? '· ' : ''}✅ ${t('ha confermato')}`}
                    {!c.indisponibile && c.risposta === 'assente' && ` ${c.ruolo ? '· ' : ''}❌ ${t('non può')}`}
                  </span>
                </span>
              </label>
            </li>
          )
        })}
      </ul>

      {stato?.error && <p className="text-sm text-red-600 dark:text-red-400">{stato.error}</p>}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-200 bg-white/95 p-4 pb-[max(1rem,var(--safe-area-inset-bottom,env(safe-area-inset-bottom)))] backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <button type="submit" disabled={invio || sel.size === 0} className={`${buttonClass('primary')} mx-auto flex w-full max-w-md py-3`}>
          {invio ? t('Salvo…') : t('Conferma {n} convocati', { n: sel.size })}
        </button>
      </div>
    </form>
  )
}
