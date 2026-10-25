'use client'

import { useRef, useState } from 'react'
import { useSceltaFoto } from '@/components/scelta-foto'
import { SQUADRE_PREDEFINITE } from '@/lib/girone'

export type GiocatoreRosa = { id: string; nome: string; forza: number; ruolo?: string }

// Foto della squadra: si scatta o si sceglie, e parte con il modulo nel campo `name` (già rimpicciolita).
function FotoSquadra({
  name,
  attuale,
  colore,
  nome,
  onAnteprima,
}: {
  name: string
  attuale?: string | null
  colore: string
  nome: string
  onAnteprima?: (url: string) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [anteprima, setAnteprima] = useState(attuale ?? null)
  const scelta = useSceltaFoto({
    titolo: `Foto di ${nome}`,
    onFoto: (foto) => {
      const dt = new DataTransfer()
      dt.items.add(foto)
      input.current!.files = dt.files
      input.current!.dispatchEvent(new Event('change', { bubbles: true }))
      const url = URL.createObjectURL(foto)
      setAnteprima(url)
      onAnteprima?.(url)
    },
  })
  return (
    <>
      <button
        type="button"
        onClick={scelta.apri}
        aria-label={`Foto di ${nome}`}
        className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full text-lg text-white"
        style={{ background: colore }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- anteprima locale (blob:) o miniatura del CDN */}
        {anteprima ? <img src={anteprima} alt="" className="h-full w-full object-cover" /> : '📷'}
      </button>
      <input ref={input} type="file" name={name} accept="image/*" hidden />
      {scelta.menu}
    </>
  )
}

// Le squadre del torneo: una scheda per squadra con i suoi giocatori; ogni giocatore si sposta
// in un'altra squadra (o fuori dal torneo) dal suo menu. Invia nome_<i> e squadra_<giocatore>.
export function SquadreEditor({
  rosa,
  numSquadre,
  nomiIniziali = SQUADRE_PREDEFINITE.map((s) => s.nome),
  coloriIniziali = SQUADRE_PREDEFINITE.map((s) => s.colore),
  fotoIniziali = [],
  squadraIniziale = {},
  onNomi,
  onFoto,
}: {
  rosa: GiocatoreRosa[]
  numSquadre: number
  nomiIniziali?: string[]
  coloriIniziali?: string[]
  fotoIniziali?: (string | null)[]
  /** giocatore → indice della squadra */
  squadraIniziale?: Record<string, string>
  /** Avvisa quando cambiano i nomi delle squadre (per l'anteprima del tabellone). */
  onNomi?: (nomi: string[]) => void
  /** Avvisa quando si sceglie la foto di una squadra (anteprima). */
  onFoto?: (squadra: number, url: string) => void
}) {
  const [nomi, setNomi] = useState(() => SQUADRE_PREDEFINITE.map((s, i) => nomiIniziali[i] ?? s.nome))
  const [squadraDi, setSquadraDi] = useState<Record<string, string>>(squadraIniziale)
  const colore = (i: number) => coloriIniziali[i] || SQUADRE_PREDEFINITE[i].colore

  // Indice valido della squadra di un giocatore ('' = fuori dal torneo).
  const di = (id: string) => {
    const v = squadraDi[id]
    return v !== undefined && v !== '' && Number(v) < numSquadre ? v : ''
  }
  const membri = (i: string) => rosa.filter((p) => di(p.id) === i)
  const fuori = membri('')

  // I giocatori scelti (o tutta la rosa, se non ne hai scelto nessuno) distribuiti "a serpentina" per forza.
  const bilancia = () => {
    const scelti = rosa.filter((p) => di(p.id) !== '')
    const ordinati = [...(scelti.length ? scelti : rosa)].sort((a, b) => b.forza - a.forza)
    const nuovo: Record<string, string> = {}
    ordinati.forEach((p, i) => {
      const pos = i % numSquadre
      nuovo[p.id] = String(Math.floor(i / numSquadre) % 2 ? numSquadre - 1 - pos : pos)
    })
    setSquadraDi(nuovo)
  }

  const sposta = (id: string, verso: string) => setSquadraDi((v) => ({ ...v, [id]: verso }))

  const riga = (p: GiocatoreRosa) => (
    <li key={p.id} className="flex items-center justify-between gap-2 py-1.5">
      <span className="min-w-0 truncate text-sm">
        {p.nome}
        <span className="text-xs text-zinc-500"> · {p.forza.toFixed(1)}</span>
      </span>
      <select
        name={`squadra_${p.id}`}
        value={di(p.id)}
        onChange={(e) => sposta(p.id, e.target.value)}
        aria-label={`Squadra di ${p.nome}`}
        className="max-w-[45%] shrink-0 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
      >
        <option value="">Fuori dal torneo</option>
        {Array.from({ length: numSquadre }, (_, i) => (
          <option key={i} value={i}>
            → {nomi[i] || SQUADRE_PREDEFINITE[i].nome}
          </option>
        ))}
      </select>
    </li>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-zinc-500">Sposta i giocatori dal loro menu, oppure tocca “Bilancia” per squadre equilibrate.</p>
        <button
          type="button"
          onClick={bilancia}
          className="shrink-0 rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
        >
          ⚖️ Bilancia
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: numSquadre }, (_, i) => {
          const m = membri(String(i))
          const media = m.length ? m.reduce((s, p) => s + p.forza, 0) / m.length : 0
          return (
            <div key={i} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800" style={{ borderTop: `4px solid ${colore(i)}` }}>
              <div className="flex items-center gap-3">
                <FotoSquadra
                  name={`foto_${i}`}
                  attuale={fotoIniziali[i]}
                  colore={colore(i)}
                  nome={nomi[i] || `squadra ${i + 1}`}
                  onAnteprima={(url) => onFoto?.(i, url)}
                />
                <div className="min-w-0 flex-1">
                  <input
                    name={`nome_${i}`}
                    value={nomi[i]}
                    onChange={(e) => {
                  const nuovi = nomi.map((x, j) => (j === i ? e.target.value : x))
                  setNomi(nuovi)
                  onNomi?.(nuovi)
                }}
                    required
                    maxLength={30}
                    aria-label={`Nome squadra ${i + 1}`}
                    className="w-full rounded-md bg-zinc-50 px-2 py-1 font-semibold outline-none focus:ring-2 focus:ring-green-600 dark:bg-zinc-800"
                  />
                  <p className={`px-2 text-xs ${m.length ? 'text-zinc-500' : 'text-red-600'}`}>
                    {m.length ? `${m.length} giocator${m.length === 1 ? 'e' : 'i'} · forza media ${media.toFixed(1)}` : 'Nessun giocatore'}
                  </p>
                </div>
              </div>
              {m.length > 0 && <ul className="mt-1 divide-y divide-zinc-100 dark:divide-zinc-800">{m.map(riga)}</ul>}
            </div>
          )
        })}
      </div>

      {fuori.length > 0 && (
        <div className="rounded-xl border border-dashed border-zinc-300 p-3 dark:border-zinc-700">
          <p className="text-sm font-semibold">Fuori dal torneo ({fuori.length})</p>
          <ul className="mt-1 divide-y divide-zinc-100 dark:divide-zinc-800">{fuori.map(riga)}</ul>
        </div>
      )}
    </div>
  )
}
