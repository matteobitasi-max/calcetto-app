// Calendario e classifica di un girone all'italiana (senza dipendenze dal server).

/** Le giornate: per ognuna le coppie [casa, ospite] (indici delle squadre). Con squadre dispari una riposa a turno. */
export function giornate(squadre: number, andataRitorno = false): [number, number][][] {
  const ids = Array.from({ length: squadre }, (_, i) => i)
  if (ids.length % 2) ids.push(-1) // riposo
  const n = ids.length
  const andata: [number, number][][] = []
  let giro = [...ids]
  for (let g = 0; g < n - 1; g++) {
    const coppie: [number, number][] = []
    for (let i = 0; i < n / 2; i++) {
      const a = giro[i]
      const b = giro[n - 1 - i]
      if (a < 0 || b < 0) continue
      // si alterna chi gioca "in casa" (squadra A) per non avere sempre gli stessi
      coppie.push((g + i) % 2 ? [b, a] : [a, b])
    }
    andata.push(coppie)
    // metodo del cerchio: la prima resta ferma, le altre ruotano
    giro = [giro[0], giro[n - 1], ...giro.slice(1, n - 1)]
  }
  return andataRitorno ? [...andata, ...andata.map((g) => g.map(([a, b]) => [b, a] as [number, number]))] : andata
}

export type RigaClassifica = { chiave: string; nome: string; colore?: string; g: number; v: number; n: number; p: number; gf: number; gs: number; punti: number }

/** Classifica: punti, poi differenza reti, poi gol fatti. */
export function classifica(
  squadre: { _key: string; nome: string; colore?: string }[],
  partite: { chiaveA?: string; chiaveB?: string; golA?: number; golB?: number }[],
  puntiVittoria = 3,
  puntiPareggio = 1,
): RigaClassifica[] {
  const righe = new Map(squadre.map((s) => [s._key, { chiave: s._key, nome: s.nome, colore: s.colore, g: 0, v: 0, n: 0, p: 0, gf: 0, gs: 0, punti: 0 }]))
  for (const m of partite) {
    const a = m.chiaveA ? righe.get(m.chiaveA) : undefined
    const b = m.chiaveB ? righe.get(m.chiaveB) : undefined
    if (!a || !b || m.golA == null || m.golB == null) continue
    for (const [r, fatti, subiti] of [
      [a, m.golA, m.golB],
      [b, m.golB, m.golA],
    ] as const) {
      r.g++
      r.gf += fatti
      r.gs += subiti
      if (fatti > subiti) {
        r.v++
        r.punti += puntiVittoria
      } else if (fatti === subiti) {
        r.n++
        r.punti += puntiPareggio
      } else r.p++
    }
  }
  return [...righe.values()].sort((x, y) => y.punti - x.punti || y.gf - y.gs - (x.gf - x.gs) || y.gf - x.gf || x.nome.localeCompare(y.nome))
}

// Nomi e colori proposti per le squadre.
export const SQUADRE_PREDEFINITE = [
  { nome: 'Rossi', colore: '#dc2626' },
  { nome: 'Blu', colore: '#2563eb' },
  { nome: 'Verdi', colore: '#16a34a' },
  { nome: 'Gialli', colore: '#eab308' },
  { nome: 'Neri', colore: '#27272a' },
  { nome: 'Bianchi', colore: '#a1a1aa' },
  { nome: 'Arancioni', colore: '#ea580c' },
  { nome: 'Viola', colore: '#9333ea' },
]
