'use client'

import { useState, useTransition } from 'react'
import type { FormState } from '@/app/actions'
import { buttonClass } from '@/components/ui-classes'
import { SKILLS, type Player, type Skill } from '@/lib/roster'
import { CHIAVE, balanceTeams, forza, medie, squilibrio } from '@/lib/teams'

export type GiocatoreFormazione = Pick<Player, '_id' | 'ruolo' | 'caratteristiche'> & {
  nome: string
  foto: string | null
  iniziali: string
}
type Lato = 'A' | 'B' | null

const SQUADRE = {
  A: { nome: 'Squadra A', bordo: 'border-t-blue-500', barra: 'bg-blue-500', testo: 'text-blue-600 dark:text-blue-400' },
  B: { nome: 'Squadra B', bordo: 'border-t-orange-500', barra: 'bg-orange-500', testo: 'text-orange-600 dark:text-orange-400' },
} as const

function Faccia({ g }: { g: GiocatoreFormazione }) {
  return g.foto ? (
    // eslint-disable-next-line @next/next/no-img-element -- miniatura già ridimensionata dal CDN di Sanity
    <img src={g.foto} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
  ) : (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold dark:bg-zinc-800">
      {g.iniziali}
    </span>
  )
}

// Formazioni a mano (tocca A/B) o in automatico, con il confronto delle caratteristiche.
export function FormazioniEditor({
  giocatori,
  iniziale,
  salva,
}: {
  giocatori: GiocatoreFormazione[]
  iniziale: Record<string, Lato>
  salva: (a: string[], b: string[]) => Promise<FormState>
}) {
  const [lato, setLato] = useState<Record<string, Lato>>(iniziale)
  const [errore, setErrore] = useState<string>()
  const [pending, startTransition] = useTransition()

  const di = (l: Lato) => giocatori.filter((g) => (lato[g._id] ?? null) === l)
  const a = di('A')
  const b = di('B')
  const liberi = di(null)
  const ma = medie(a)
  const mb = medie(b)
  const sq = squilibrio(a, b)
  const giudizio =
    sq < 3
      ? { testo: 'equilibrate', colore: 'text-green-600' }
      : sq < 6
        ? { testo: 'quasi pari', colore: 'text-amber-600' }
        : { testo: 'sbilanciate', colore: 'text-red-600' }

  function automatico() {
    const { a, b } = balanceTeams(giocatori)
    setLato(Object.fromEntries([...a.map((g) => [g._id, 'A']), ...b.map((g) => [g._id, 'B'])]))
    setErrore(undefined)
  }

  function sposta(id: string, l: Lato) {
    setLato({ ...lato, [id]: l })
    setErrore(undefined)
  }

  const riga = (g: GiocatoreFormazione, l: Lato) => (
    <li key={g._id} className="flex items-center gap-2">
      <Faccia g={g} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">{g.nome}</span>
        <span className="block text-xs capitalize text-zinc-500">
          {g.ruolo && `${g.ruolo} · `}forza {forza(g).toFixed(1)}
        </span>
      </span>
      {(['A', 'B'] as const).map((x) => (
        <button
          key={x}
          type="button"
          onClick={() => sposta(g._id, l === x ? null : x)}
          className={`h-8 w-8 rounded-full text-sm font-bold ${
            l === x ? `${SQUADRE[x].barra} text-white` : 'border border-zinc-300 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800'
          }`}
          aria-label={`Metti ${g.nome} nella ${SQUADRE[x].nome}`}
        >
          {x}
        </button>
      ))}
    </li>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={automatico} className={buttonClass('primary')}>
          ⚖️ Automatico
        </button>
        <button type="button" onClick={() => setLato({})} className={buttonClass('secondary')}>
          Svuota
        </button>
      </div>
      <p className="text-xs text-zinc-500">
        L&apos;automatico pesa di più cervello, scatto, fiato e tecnica e cerca di pareggiarle una per una. Premilo di nuovo
        per un&apos;altra proposta; poi puoi ritoccare a mano.
      </p>

      {liberi.length > 0 && (
        <section className="rounded-xl border border-dashed border-zinc-300 p-4 dark:border-zinc-700">
          <h2 className="mb-3 text-sm font-semibold">Da assegnare ({liberi.length})</h2>
          <ul className="space-y-2">
            {liberi.map((g) => riga(g, null))}
          </ul>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {([['A', a], ['B', b]] as const).map(([x, squadra]) => (
          <section key={x} className={`rounded-xl border border-t-4 border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 ${SQUADRE[x].bordo}`}>
            <h2 className="mb-3 flex justify-between font-semibold">
              {SQUADRE[x].nome} ({squadra.length})
              <span className="text-sm font-normal text-zinc-500">forza {squadra.reduce((s, g) => s + forza(g), 0).toFixed(1)}</span>
            </h2>
            {squadra.length === 0 ? (
              <p className="text-sm text-zinc-500">Nessuno: tocca {x} accanto a un giocatore.</p>
            ) : (
              <ul className="space-y-2">
                {squadra.map((g) => riga(g, x))}
              </ul>
            )}
          </section>
        ))}
      </div>

      {a.length > 0 && b.length > 0 && (
        <section className="space-y-2 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="flex justify-between text-sm font-semibold">
            Confronto (media per giocatore)
            <span className={giudizio.colore}>{giudizio.testo}</span>
          </h2>
          {(Object.entries(SKILLS) as [Skill, string][]).map(([k, label]) => (
            <div key={k} className="grid grid-cols-[2.5rem_1fr_5.5rem_1fr_2.5rem] items-center gap-2 text-xs">
              <span className={`text-right font-semibold tabular-nums ${SQUADRE.A.testo}`}>{ma[k].toFixed(1)}</span>
              <span className="flex h-2 justify-end rounded bg-zinc-100 dark:bg-zinc-800">
                <span className={`rounded ${SQUADRE.A.barra}`} style={{ width: `${ma[k] * 10}%` }} />
              </span>
              <span className={`text-center ${CHIAVE.includes(k) ? 'font-semibold' : 'text-zinc-500'}`}>{label}</span>
              <span className="flex h-2 rounded bg-zinc-100 dark:bg-zinc-800">
                <span className={`rounded ${SQUADRE.B.barra}`} style={{ width: `${mb[k] * 10}%` }} />
              </span>
              <span className={`font-semibold tabular-nums ${SQUADRE.B.testo}`}>{mb[k].toFixed(1)}</span>
            </div>
          ))}
        </section>
      )}

      {errore && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{errore}</p>}
      <button
        type="button"
        disabled={pending || liberi.length > 0 || !a.length || !b.length}
        onClick={() =>
          startTransition(async () => {
            const r = await salva(
              a.map((g) => g._id),
              b.map((g) => g._id),
            )
            if (r?.error) setErrore(r.error)
          })
        }
        className={`${buttonClass('primary')} w-full`}
      >
        {pending ? 'Salvo…' : liberi.length > 0 ? `Assegna ancora ${liberi.length} giocator${liberi.length === 1 ? 'e' : 'i'}` : 'Salva formazioni'}
      </button>
    </div>
  )
}
