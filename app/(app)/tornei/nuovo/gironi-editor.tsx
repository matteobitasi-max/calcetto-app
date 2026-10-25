'use client'

import { useState } from 'react'
import { LETTERE_GIRONI, SQUADRE_PREDEFINITE, gironiDiBase } from '@/lib/girone'

// Squadre nei gironi: una scheda per girone, ogni squadra si sposta dal suo menu; "Sorteggia" le mescola.
// Invia girone_<squadra> = indice del girone. Va montato con una key che cambia con squadre e gironi.
export function GironiEditor({ numSquadre, numGironi, nomi, foto }: { numSquadre: number; numGironi: number; nomi: string[]; foto: (string | null)[] }) {
  const [girone, setGirone] = useState(() => gironiDiBase(numSquadre, numGironi))

  const sorteggia = () => {
    const ordine = Array.from({ length: numSquadre }, (_, i) => i).sort(() => Math.random() - 0.5)
    const nuovo = Array<number>(numSquadre)
    ordine.forEach((sq, i) => (nuovo[sq] = i % numGironi))
    setGirone(nuovo)
  }

  return (
    <div className="space-y-3">
      {girone.map((g, i) => (
        <input key={i} type="hidden" name={`girone_${i}`} value={g} />
      ))}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-zinc-500">Sposta una squadra dal suo menu, oppure sorteggia i gironi.</p>
        <button
          type="button"
          onClick={sorteggia}
          className="shrink-0 rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
        >
          🎲 Sorteggia
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {LETTERE_GIRONI.slice(0, numGironi).map((lettera, gi) => {
          const dentro = girone.map((g, sq) => (g === gi ? sq : -1)).filter((sq) => sq >= 0)
          return (
            <div key={lettera} className={`rounded-xl border p-3 ${dentro.length < 2 ? 'border-red-300 dark:border-red-800' : 'border-zinc-200 dark:border-zinc-800'}`}>
              <p className="font-semibold">Girone {lettera}</p>
              {dentro.length < 2 && <p className="text-xs text-red-600">Servono almeno 2 squadre</p>}
              <ul className="mt-1 divide-y divide-zinc-100 dark:divide-zinc-800">
                {dentro.map((sq) => (
                  <li key={sq} className="flex items-center justify-between gap-2 py-1.5">
                    <span className="flex min-w-0 items-center gap-2 text-sm">
                      {foto[sq] ? (
                        // eslint-disable-next-line @next/next/no-img-element -- anteprima locale
                        <img src={foto[sq]!} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
                      ) : (
                        <span className="mx-1 h-3 w-3 shrink-0 rounded-full" style={{ background: SQUADRE_PREDEFINITE[sq]?.colore }} />
                      )}
                      <span className="truncate font-medium">{nomi[sq] || SQUADRE_PREDEFINITE[sq]?.nome}</span>
                    </span>
                    <select
                      value={gi}
                      onChange={(e) => setGirone((v) => v.map((x, j) => (j === sq ? Number(e.target.value) : x)))}
                      aria-label={`Girone di ${nomi[sq]}`}
                      className="shrink-0 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                    >
                      {LETTERE_GIRONI.slice(0, numGironi).map((l, j) => (
                        <option key={l} value={j}>
                          → Girone {l}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
