// Tabellone a eliminazione diretta (senza dipendenze dal server).
// Le squadre sono in ordine di testa di serie; il tabellone ha come dimensione la potenza di 2
// successiva: chi non ha avversario al primo turno passa direttamente (bye).

/** Ordine classico delle teste di serie nel primo turno (1-8, 4-5, 2-7, 3-6 …), indici da 0. */
export function ordineTeste(dimensione: number): number[] {
  let ordine = [0, 1]
  while (ordine.length < dimensione) {
    const n = ordine.length * 2
    ordine = ordine.flatMap((s) => [s, n - 1 - s])
  }
  return ordine.slice(0, dimensione)
}

export const dimensioneTabellone = (squadre: number) => 2 ** Math.ceil(Math.log2(Math.max(2, squadre)))
export const turniTabellone = (squadre: number) => Math.log2(dimensioneTabellone(squadre))

export function nomeTurno(turno: number, turni: number) {
  const mancanti = turni - turno
  return ['Finale', 'Semifinali', 'Quarti di finale', 'Ottavi di finale', 'Sedicesimi di finale'][mancanti] ?? `Turno ${turno}`
}

type PartitaTabellone = { _id: string; turno?: number; posizione?: number; chiaveA?: string; chiaveB?: string; stato: string; golA?: number; golB?: number; passa?: 'A' | 'B' }

export type Incrocio<M> = {
  turno: number
  posizione: number
  a?: string
  b?: string
  /** Al primo turno: una sola squadra, che passa senza giocare. */
  bye: boolean
  partita?: M
  vincitore?: string
}

const vincente = (m: PartitaTabellone) => {
  if (m.stato !== 'giocata' || m.golA == null || m.golB == null) return undefined
  if (m.golA !== m.golB) return m.golA > m.golB ? m.chiaveA : m.chiaveB
  return m.passa === 'A' ? m.chiaveA : m.passa === 'B' ? m.chiaveB : undefined
}

/** Il tabellone completo: per ogni turno gli incroci, con squadre note, partita e vincitore. */
export function tabellone<M extends PartitaTabellone>(chiavi: string[], partite: M[]): Incrocio<M>[][] {
  const dim = dimensioneTabellone(chiavi.length)
  const turni = Math.log2(dim)
  const trova = (t: number, p: number) => partite.find((m) => m.turno === t && m.posizione === p)
  const teste = ordineTeste(dim)
  const risultato: Incrocio<M>[][] = []
  for (let t = 1; t <= turni; t++) {
    const incroci: Incrocio<M>[] = []
    for (let p = 0; p < dim / 2 ** t; p++) {
      let a: string | undefined
      let b: string | undefined
      if (t === 1) {
        a = chiavi[teste[2 * p]]
        b = chiavi[teste[2 * p + 1]]
      } else {
        a = risultato[t - 2][2 * p].vincitore
        b = risultato[t - 2][2 * p + 1].vincitore
      }
      const bye = t === 1 && (!a || !b)
      const partita = trova(t, p)
      incroci.push({ turno: t, posizione: p, a, b, bye, partita, vincitore: bye ? (a ?? b) : partita ? vincente(partita) : undefined })
    }
    risultato.push(incroci)
  }
  return risultato
}

/** Gli incroci in cui si conoscono entrambe le squadre ma la partita non c'è ancora. */
export const daCreare = <M extends PartitaTabellone>(t: Incrocio<M>[][]) => t.flat().filter((i) => !i.bye && i.a && i.b && !i.partita)
