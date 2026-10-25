'use client'

import { useRef, useState } from 'react'
import { SQUADRE_PREDEFINITE } from '@/lib/girone'
import { nomeTurno, primoTurnoTeste, turniTabellone } from '@/lib/tabellone'

// Il primo turno dall'alto in basso (indici delle squadre): due posti consecutivi (1°-2°, 3°-4°, …) sono un incrocio.
// Con squadre dispari l'ultima passa direttamente.
const indici = (n: number) => Array.from({ length: n }, (_, i) => i)
const teste = (n: number) => primoTurnoTeste(indici(n).map(String)).map(Number)
const mescola = (n: number) => indici(n).sort(() => Math.random() - 0.5)

// Spostamento minimo del dito (px) prima che parta il trascinamento: un tocco o un tremolio non sposta niente.
const SOGLIA = 10

// Il primo turno come lista da riordinare col dito: si trascina dalla maniglia ⠿ e le altre squadre si spostano.
// Le squadre sono quelle scelte sopra (nomi e foto). Invia `primoTurno` (JSON).
// Va montato con key={numSquadre}: cambiando il numero di squadre si riparte dalle teste di serie.
export function PrimoTurnoEditor({ numSquadre, nomi, foto }: { numSquadre: number; nomi: string[]; foto: (string | null)[] }) {
  const [posti, setPosti] = useState(() => teste(numSquadre))
  // trascinamento: posto attuale dell'elemento, da dove è partito il dito, se ha superato la soglia
  const [trascino, setTrascino] = useState<{ indice: number; y0: number; attivo: boolean } | null>(null)
  const lista = useRef<HTMLOListElement>(null)

  const turni = turniTabellone(numSquadre)

  // Il posto sotto il dito: quello col centro più vicino.
  const postoA = (y: number) => {
    const righe = [...(lista.current?.querySelectorAll<HTMLElement>('[data-riga]') ?? [])]
    let migliore = 0
    let distanza = Infinity
    righe.forEach((r, i) => {
      const box = r.getBoundingClientRect()
      const d = Math.abs(box.top + box.height / 2 - y)
      if (d < distanza) {
        distanza = d
        migliore = i
      }
    })
    return migliore
  }

  const sposta = (da: number, a: number) =>
    setPosti((v) => {
      const nuovo = [...v]
      const [x] = nuovo.splice(da, 1)
      nuovo.splice(a, 0, x)
      return nuovo
    })

  const nome = (sq: number) => nomi[sq] || SQUADRE_PREDEFINITE[sq]?.nome

  return (
    <div className="space-y-3">
      <input type="hidden" name="primoTurno" value={JSON.stringify(posti)} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-zinc-500">{nomeTurno(1, turni)}: trascina dalla maniglia ⠿ per cambiare gli incroci.</p>
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

      <ol ref={lista}>
        {posti.map((sq, i) => {
          const inizioIncrocio = i % 2 === 0
          const daSola = inizioIncrocio && i === posti.length - 1 // dispari: l'ultima passa direttamente
          const trascinato = trascino?.attivo && trascino.indice === i
          return (
            <li key={sq} className={inizioIncrocio && i > 0 ? 'pt-3' : ''}>
              {inizioIncrocio && (
                <p className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                  {daSola ? 'Passa direttamente il primo turno' : `Incrocio ${i / 2 + 1}`}
                </p>
              )}
              <div
                data-riga
                className={`flex items-center gap-3 border bg-white px-2 py-2 transition-shadow dark:bg-zinc-900 ${
                  daSola ? 'rounded-xl' : inizioIncrocio ? 'rounded-t-xl' : '-mt-px rounded-b-xl'
                } ${trascinato ? 'relative z-10 border-green-600 shadow-lg' : 'border-zinc-200 dark:border-zinc-800'}`}
              >
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Sposta ${nome(sq)}`}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId)
                    setTrascino({ indice: i, y0: e.clientY, attivo: false })
                  }}
                  onPointerMove={(e) => {
                    if (!trascino) return
                    if (!trascino.attivo && Math.abs(e.clientY - trascino.y0) < SOGLIA) return
                    const dove = postoA(e.clientY)
                    if (dove !== trascino.indice) sposta(trascino.indice, dove)
                    setTrascino({ ...trascino, indice: dove, attivo: true })
                  }}
                  onPointerUp={() => setTrascino(null)}
                  onPointerCancel={() => setTrascino(null)}
                  onKeyDown={(e) => {
                    // da tastiera: frecce su/giù
                    if (e.key === 'ArrowUp' && i > 0) sposta(i, i - 1)
                    if (e.key === 'ArrowDown' && i < posti.length - 1) sposta(i, i + 1)
                  }}
                  className="flex h-10 w-9 shrink-0 cursor-grab touch-none select-none items-center justify-center rounded-lg text-xl text-zinc-400 hover:bg-zinc-100 active:cursor-grabbing dark:hover:bg-zinc-800"
                >
                  ⠿
                </span>
                {foto[sq] ? (
                  // eslint-disable-next-line @next/next/no-img-element -- anteprima locale o miniatura del CDN
                  <img src={foto[sq]!} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="mx-2 h-4 w-4 shrink-0 rounded-full" style={{ background: SQUADRE_PREDEFINITE[sq]?.colore }} />
                )}
                <span className="min-w-0 flex-1 truncate font-medium">{nome(sq)}</span>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
