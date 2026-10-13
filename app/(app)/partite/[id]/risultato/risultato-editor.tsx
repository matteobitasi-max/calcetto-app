'use client'

import { useState } from 'react'
import type { FormState } from '@/app/actions'
import { ActionForm } from '@/components/action-form'
import { SubmitButton } from '@/components/submit-button'
import { buttonClass } from '@/components/ui-classes'

export type Giocatore = { id: string; nome: string; foto: string | null; iniziali: string }
type Squadra = { chiave: 'A' | 'B'; nome: string; colore: string; giocatori: Giocatore[] }

function Stepper({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  const btn = 'h-8 w-8 rounded-full border border-zinc-300 text-lg leading-none hover:bg-zinc-100 disabled:opacity-30 dark:border-zinc-700 dark:hover:bg-zinc-800'
  return (
    <div className="flex items-center gap-2" aria-label={label}>
      <button type="button" className={btn} disabled={value === 0} onClick={() => onChange(value - 1)} aria-label={`Togli un gol a ${label}`}>
        −
      </button>
      <span className={`w-5 text-center font-bold tabular-nums ${value ? '' : 'text-zinc-400'}`}>{value}</span>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} aria-label={`Aggiungi un gol a ${label}`}>
        +
      </button>
    </div>
  )
}

// Gol per giocatore (il punteggio si calcola da solo) e scelta dell'MVP.
export function RisultatoEditor({
  action,
  squadre,
  golIniziali,
  autogolIniziali,
  mvpIniziale,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>
  squadre: [Squadra, Squadra]
  golIniziali: Record<string, number>
  autogolIniziali: { A: number; B: number }
  mvpIniziale?: string
}) {
  const [gol, setGol] = useState(golIniziali)
  const [autogol, setAutogol] = useState(autogolIniziali)
  const [mvp, setMvp] = useState(mvpIniziale ?? '')

  const punteggio = (s: Squadra) => s.giocatori.reduce((t, g) => t + (gol[g.id] ?? 0), 0) + autogol[s.chiave]
  const [a, b] = squadre

  return (
    <ActionForm action={action} className="space-y-4">
      <div className="sticky top-14 z-10 flex items-center justify-center gap-4 rounded-xl border border-zinc-200 bg-white/95 p-4 text-center backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95">
        <span className="flex-1 text-right text-sm font-medium">{a.nome}</span>
        <span className="text-4xl font-bold tabular-nums">
          {punteggio(a)} – {punteggio(b)}
        </span>
        <span className="flex-1 text-left text-sm font-medium">{b.nome}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {squadre.map((s) => (
          <section key={s.chiave} className={`rounded-xl border border-t-4 border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 ${s.colore}`}>
            <h2 className="mb-3 font-semibold">{s.nome}</h2>
            <ul className="space-y-3">
              {s.giocatori.map((g) => (
                <li key={g.id} className="flex items-center gap-2">
                  {g.foto ? (
                    // eslint-disable-next-line @next/next/no-img-element -- miniatura già ridimensionata dal CDN di Sanity
                    <img src={g.foto} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold dark:bg-zinc-800">
                      {g.iniziali}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm">{g.nome}</span>
                  <button
                    type="button"
                    onClick={() => setMvp(mvp === g.id ? '' : g.id)}
                    title="MVP"
                    aria-pressed={mvp === g.id}
                    className={`text-xl ${mvp === g.id ? '' : 'opacity-25 grayscale hover:opacity-60'}`}
                  >
                    🫑
                  </button>
                  <Stepper label={g.nome} value={gol[g.id] ?? 0} onChange={(n) => setGol({ ...gol, [g.id]: n })} />
                  <input type="hidden" name={`gol_${g.id}`} value={gol[g.id] ?? 0} />
                </li>
              ))}
              <li className="flex items-center gap-2 border-t border-zinc-200 pt-3 text-sm text-zinc-500 dark:border-zinc-800">
                <span className="flex-1">Autogol avversari / altri</span>
                <Stepper label={`autogol ${s.nome}`} value={autogol[s.chiave]} onChange={(n) => setAutogol({ ...autogol, [s.chiave]: n })} />
                <input type="hidden" name={`autogol${s.chiave}`} value={autogol[s.chiave]} />
              </li>
            </ul>
          </section>
        ))}
      </div>

      <input type="hidden" name="mvp" value={mvp} />
      <p className="text-sm text-zinc-500">
        {mvp ? (
          <>
            🫑 MVP: <b className="text-zinc-900 dark:text-zinc-100">{[...a.giocatori, ...b.giocatori].find((g) => g.id === mvp)?.nome}</b>
          </>
        ) : (
          'Tocca il 🫑 accanto a un giocatore per sceglierlo come MVP.'
        )}
      </p>

      <SubmitButton className={`${buttonClass('primary')} w-full`} pendingText="Salvo…">
        Salva risultato
      </SubmitButton>
    </ActionForm>
  )
}
