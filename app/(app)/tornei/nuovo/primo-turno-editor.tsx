'use client'

import { useRef, useState } from 'react'
import { SQUADRE_PREDEFINITE } from '@/lib/girone'
import { dimensioneTabellone, nomeTurno, ordineTeste, turniTabellone } from '@/lib/tabellone'

// Posti del primo turno: indice della squadra, -1 = vuoto (chi è accanto passa direttamente).
const teste = (n: number) => ordineTeste(dimensioneTabellone(n)).map((t) => (t < n ? t : -1))

function mescola(n: number) {
  const dim = dimensioneTabellone(n)
  // prima i posti vuoti, uno per incrocio (mai due vuoti insieme), poi le squadre a caso negli altri posti
  const incroci = Array.from({ length: dim / 2 }, (_, i) => i).sort(() => Math.random() - 0.5)
  const posti = Array<number>(dim).fill(-2)
  incroci.slice(0, dim - n).forEach((p) => (posti[2 * p + (Math.random() < 0.5 ? 0 : 1)] = -1))
  const squadre = Array.from({ length: n }, (_, i) => i).sort(() => Math.random() - 0.5)
  return posti.map((v) => (v === -1 ? -1 : squadre.pop()!))
}

const valido = (posti: number[]) => posti.every((_, i) => i % 2 || posti[i] >= 0 || posti[i + 1] >= 0)

// Il primo turno del tabellone: si trascinano le squadre (o si tocca una e poi l'altra) per scambiarle.
// "Sorteggia" le mescola a caso; si possono comunque spostare dopo. Invia `primoTurno` (JSON).
// Va montato con key={numSquadre}: cambiando il numero di squadre si riparte dalle teste di serie.
export function PrimoTurnoEditor({ numSquadre, nomi }: { numSquadre: number; nomi: string[] }) {
  const [posti, setPosti] = useState(() => teste(numSquadre))
  const [scelto, setScelto] = useState<number | null>(null)
  // trascinamento in corso: da quale posto, dove è partito il dito e dove si trova; `mosso` dopo qualche pixel
  const [trascino, setTrascino] = useState<{ da: number; x0: number; y0: number; x: number; y: number; mosso: boolean } | null>(null)
  const appenaTrascinato = useRef(false)

  const scambia = (a: number, b: number) => {
    if (a === b) return
    setPosti((v) => {
      const nuovo = [...v]
      ;[nuovo[a], nuovo[b]] = [nuovo[b], nuovo[a]]
      return nuovo
    })
  }

  const postoSotto = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-posto]')
    return el ? Number(el.dataset.posto) : null
  }

  const turni = turniTabellone(numSquadre)
  const ok = valido(posti)

  const posto = (i: number) => {
    const sq = posti[i]
    const colore = sq >= 0 ? SQUADRE_PREDEFINITE[sq]?.colore : undefined
    const attivo = scelto === i || (trascino?.mosso && trascino.da === i)
    return (
      <div
        key={i}
        data-posto={i}
        onClick={() => {
          if (appenaTrascinato.current) {
            appenaTrascinato.current = false
            return
          }
          // tocco: il primo sceglie, il secondo scambia
          if (scelto == null) setScelto(posti[i] >= 0 ? i : null)
          else {
            scambia(scelto, i)
            setScelto(null)
          }
        }}
        onPointerDown={(e) => {
          appenaTrascinato.current = false
          if (posti[i] < 0) return
          ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
          setTrascino({ da: i, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, mosso: false })
        }}
        onPointerMove={(e) => {
          if (trascino?.da !== i) return
          const mosso = trascino.mosso || Math.hypot(e.clientX - trascino.x0, e.clientY - trascino.y0) > 8
          setTrascino({ ...trascino, x: e.clientX, y: e.clientY, mosso })
        }}
        onPointerUp={(e) => {
          if (trascino?.da !== i) return
          setTrascino(null)
          if (!trascino.mosso) return // era un tocco: ci pensa onClick
          appenaTrascinato.current = true
          const dove = postoSotto(e.clientX, e.clientY)
          if (dove != null && dove !== i) scambia(i, dove)
          setScelto(null)
        }}
        onPointerCancel={() => setTrascino(null)}
        className={`flex touch-none select-none items-center gap-2 px-3 py-2 text-sm ${sq >= 0 ? 'cursor-grab' : ''} ${
          attivo ? 'bg-green-100 ring-2 ring-inset ring-green-600 dark:bg-green-950' : ''
        }`}
      >
        {sq >= 0 ? (
          <>
            <span className="text-zinc-400" aria-hidden>
              ⠿
            </span>
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: colore }} />
            <span className="truncate font-medium">{nomi[sq] || SQUADRE_PREDEFINITE[sq]?.nome}</span>
          </>
        ) : (
          <span className="italic text-zinc-400">— passa chi è sopra/sotto</span>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name="primoTurno" value={JSON.stringify(posti)} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-zinc-500">
          {nomeTurno(1, turni)}: trascina una squadra su un&apos;altra per scambiarle (o tocca una e poi l&apos;altra).
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPosti(mescola(numSquadre))}
            className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          >
            🎲 Sorteggia
          </button>
          <button
            type="button"
            onClick={() => setPosti(teste(numSquadre))}
            className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          >
            Teste di serie
          </button>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {Array.from({ length: posti.length / 2 }, (_, p) => (
          <div
            key={p}
            className={`divide-y overflow-hidden rounded-xl border ${
              posti[2 * p] < 0 && posti[2 * p + 1] < 0
                ? 'divide-red-200 border-red-400'
                : 'divide-zinc-100 border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800'
            }`}
          >
            {posto(2 * p)}
            {posto(2 * p + 1)}
          </div>
        ))}
      </div>
      {!ok && <p className="text-sm text-red-600">Un incrocio è senza squadre: sposta una squadra lì.</p>}
      {trascino?.mosso && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-600 px-3 py-1.5 text-sm font-semibold text-white shadow-lg"
          style={{ left: trascino.x, top: trascino.y }}
        >
          {nomi[posti[trascino.da]] || SQUADRE_PREDEFINITE[posti[trascino.da]]?.nome}
        </div>
      )}
    </div>
  )
}
