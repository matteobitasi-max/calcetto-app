// Tabellone a eliminazione diretta (senza dipendenze dal server).
// Il primo turno è una lista di squadre accoppiate a due a due (1ª-2ª, 3ª-4ª, …); al turno dopo vanno le vincenti
// nello stesso ordine. Se in un turno le squadre sono dispari, l'ultima passa direttamente.
// (I tornei creati prima avevano posti vuoti '' per arrivare a 4, 8, 16: una squadra accanto a un vuoto passa.)

/** Ordine classico delle teste di serie (1-8, 4-5, 2-7, 3-6 …), indici da 0. */
export function ordineTeste(dimensione: number): number[] {
  let ordine = [0, 1]
  while (ordine.length < dimensione) {
    const n = ordine.length * 2
    ordine = ordine.flatMap((s) => [s, n - 1 - s])
  }
  return ordine.slice(0, dimensione)
}

const potenza = (n: number) => 2 ** Math.ceil(Math.log2(Math.max(2, n)))

/** Quanti turni servono per arrivare a una vincitrice. */
export function turniTabellone(squadre: number) {
  let turni = 0
  for (let n = squadre; n > 1; n = Math.ceil(n / 2)) turni++
  return Math.max(1, turni)
}

/** Partite di ogni turno, dal primo alla finale. */
export function partitePerTurno(squadre: number) {
  const out: number[] = []
  for (let n = squadre; n > 1; n = Math.ceil(n / 2)) out.push(Math.floor(n / 2))
  return out
}

export function nomeTurno(turno: number, turni: number) {
  const mancanti = turni - turno
  return ['Finale', 'Semifinali', 'Quarti di finale', 'Ottavi di finale', 'Sedicesimi di finale'][mancanti] ?? `Turno ${turno}`
}

/** Primo turno di base (teste di serie): le squadre in un ordine che tiene lontane le più forti. */
export const primoTurnoTeste = (chiavi: string[]) => ordineTeste(potenza(chiavi.length)).filter((t) => t < chiavi.length).map((t) => chiavi[t])

/** Un primo turno è valido se ci sono tutte le squadre una volta sola (e, nei vecchi tornei, nessun incrocio vuoto). */
export function primoTurnoValido(posti: string[], chiavi: string[]) {
  const piene = posti.filter(Boolean)
  if (piene.length !== chiavi.length || new Set(piene).size !== chiavi.length || !piene.every((k) => chiavi.includes(k))) return false
  for (let p = 0; p < posti.length; p += 2) if (!posti[p] && p + 1 < posti.length && !posti[p + 1]) return false
  return true
}

type PartitaTabellone = { _id: string; turno?: number; posizione?: number; chiaveA?: string; chiaveB?: string; stato: string; golA?: number; golB?: number; passa?: 'A' | 'B' }

export type Incrocio<M> = {
  turno: number
  posizione: number
  a?: string
  b?: string
  /** Una sola squadra (dispari o posto vuoto): passa senza giocare. */
  bye: boolean
  partita?: M
  vincitore?: string
}

const vincente = (m: PartitaTabellone) => {
  if (m.stato !== 'giocata' || m.golA == null || m.golB == null) return undefined
  if (m.golA !== m.golB) return m.golA > m.golB ? m.chiaveA : m.chiaveB
  return m.passa === 'A' ? m.chiaveA : m.passa === 'B' ? m.chiaveB : undefined
}

// Un posto del turno: la squadra (se si sa già), oppure vuoto (nessuno arriverà).
type Posto = { chiave?: string; vuoto: boolean }

/** Il tabellone completo: per ogni turno gli incroci, con squadre note, partita e vincitore.
 * `primoTurno`: l'ordine scelto (altrimenti quello delle teste di serie). */
export function tabellone<M extends PartitaTabellone>(chiavi: string[], partite: M[], primoTurno?: string[]): Incrocio<M>[][] {
  const trova = (t: number, p: number) => partite.find((m) => m.turno === t && m.posizione === p)
  const ordine = primoTurno && primoTurnoValido(primoTurno, chiavi) ? primoTurno : primoTurnoTeste(chiavi)
  let posti: Posto[] = ordine.map((k) => (k ? { chiave: k, vuoto: false } : { vuoto: true }))
  const risultato: Incrocio<M>[][] = []
  for (let t = 1; posti.filter((p) => !p.vuoto).length > 1 || (t === 1 && posti.length > 1); t++) {
    if (posti.length % 2) posti = [...posti, { vuoto: true }] // dispari: l'ultima passa
    const incroci: Incrocio<M>[] = []
    for (let p = 0; p < posti.length / 2; p++) {
      const [x, y] = [posti[2 * p], posti[2 * p + 1]]
      const bye = x.vuoto || y.vuoto
      const partita = bye ? undefined : trova(t, p)
      incroci.push({
        turno: t,
        posizione: p,
        a: x.chiave,
        b: y.chiave,
        bye,
        partita,
        vincitore: bye ? (x.chiave ?? y.chiave) : partita ? vincente(partita) : undefined,
      })
    }
    risultato.push(incroci)
    // incroci vuoti dei vecchi tornei (due posti vuoti) non mandano nessuno avanti
    posti = incroci.map((i) => ({ chiave: i.vincitore, vuoto: i.bye && !i.a && !i.b }))
    if (incroci.length === 1) break
  }
  return risultato
}

/** Gli incroci in cui si conoscono entrambe le squadre ma la partita non c'è ancora. */
export const daCreare = <M extends PartitaTabellone>(t: Incrocio<M>[][]) => t.flat().filter((i) => !i.bye && i.a && i.b && !i.partita)
