// Punteggio della classifica generale, partita per partita.
export const PUNTI = {
  vittoria: 3,
  pareggio: 1,
  gol: 1,
  mvp: 3,
  golSubito: -0.25,
} as const

export type PartitaPunteggio = {
  a: string[]
  b: string[]
  golA: number
  golB: number
  marcatori: { id: string; gol: number }[]
  mvp?: string
}

// I punti presi da ogni giocatore in una partita.
export function puntiPartita(m: PartitaPunteggio) {
  const punti = new Map<string, number>()
  for (const [squadra, fatti, subiti] of [
    [m.a, m.golA, m.golB],
    [m.b, m.golB, m.golA],
  ] as const) {
    const esito = fatti > subiti ? PUNTI.vittoria : fatti === subiti ? PUNTI.pareggio : 0
    for (const id of squadra) punti.set(id, esito + subiti * PUNTI.golSubito)
  }
  for (const g of m.marcatori) if (punti.has(g.id)) punti.set(g.id, punti.get(g.id)! + g.gol * PUNTI.gol)
  if (m.mvp && punti.has(m.mvp)) punti.set(m.mvp, punti.get(m.mvp)! + PUNTI.mvp)
  return punti
}

// Posizioni con i pari merito (1, 1, 3…): a parità di punti conta chi ha giocato meno partite.
function posizioni(totali: Map<string, { punti: number; giocate: number }>) {
  const ordinati = [...totali.entries()].sort(([, x], [, y]) => y.punti - x.punti || x.giocate - y.giocate)
  const pos = new Map<string, number>()
  ordinati.forEach(([id, t], i) => {
    const prec = ordinati[i - 1]
    pos.set(id, prec && prec[1].punti === t.punti && prec[1].giocate === t.giocate ? pos.get(prec[0])! : i + 1)
  })
  return pos
}

export type RigaClassifica = {
  id: string
  punti: number
  giocate: number
  posizione: number
  /** Posizione prima dell'ultima partita (null = entra ora in classifica). */
  posizionePrima: number | null
  /** Punti presi nell'ultima partita (null = non l'ha giocata). */
  ultima: number | null
}

// Classifica progressiva: totali dopo tutte le partite (in ordine di data) e
// confronto con la classifica prima dell'ultima partita giocata.
export function classifica(partite: PartitaPunteggio[]): RigaClassifica[] {
  const totali = new Map<string, { punti: number; giocate: number }>()
  let prima = new Map<string, number>()
  let ultima = new Map<string, number>()
  partite.forEach((m, i) => {
    if (i === partite.length - 1) prima = posizioni(totali)
    ultima = puntiPartita(m)
    for (const [id, p] of ultima) {
      const t = totali.get(id) ?? { punti: 0, giocate: 0 }
      totali.set(id, { punti: t.punti + p, giocate: t.giocate + 1 })
    }
  })
  const dopo = posizioni(totali)
  return [...totali.entries()]
    .map(([id, t]) => ({
      id,
      punti: t.punti,
      giocate: t.giocate,
      posizione: dopo.get(id)!,
      posizionePrima: prima.get(id) ?? null,
      ultima: ultima.get(id) ?? null,
    }))
    .sort((x, y) => x.posizione - y.posizione)
}
