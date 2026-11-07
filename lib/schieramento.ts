import type { Player } from './roster'

// Come si dispone una squadra in campo: un portiere e tre linee, secondo i ruoli del profilo.
// È casuale ma sempre uguale per la stessa squadra in quella partita: tutti vedono la stessa formazione,
// e non si salva niente (cambia solo se cambiano i giocatori).

type Giocatore = Pick<Player, '_id' | 'ruolo'>
export type Schieramento<G> = { portiere?: G; linee: [G[], G[], G[]]; modulo: string }

const LINEE = ['difensore', 'centrocampista', 'attaccante']

// Numeri casuali ripetibili (mulberry32), a partire da un testo.
function casuale(seme: string) {
  let h = 0
  for (const c of seme) h = (Math.imul(h, 31) + c.charCodeAt(0)) | 0
  return () => {
    h = (h + 0x6d2b79f5) | 0
    let x = Math.imul(h ^ (h >>> 15), 1 | h)
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
    return ((x ^ (x >>> 14)) >>> 0) / 2 ** 32
  }
}

function mischia<T>(lista: T[], caso: () => number) {
  const copia = [...lista]
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(caso() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

// Tutti i moduli possibili per n giocatori di movimento, senza linee troppo piene.
function moduli(n: number) {
  if (n < 3) return [n === 2 ? [1, 0, 1] : [0, n, 0]]
  const max = Math.ceil(n / 2)
  const lista: number[][] = []
  for (let d = 1; d <= max; d++) for (let c = 1; c <= max; c++) if (n - d - c >= 1 && n - d - c <= max) lista.push([d, c, n - d - c])
  return lista
}

export function schiera<G extends Giocatore>(giocatori: G[], seme: string): Schieramento<G> {
  const inOrdine = [...giocatori].sort((a, b) => a._id.localeCompare(b._id))
  const caso = casuale(`${seme}:${inOrdine.map((g) => g._id).join()}`)
  const restanti = mischia(inOrdine, caso)
  const togli = (g?: G) => {
    if (g) restanti.splice(restanti.indexOf(g), 1)
    return g
  }

  // In porta il portiere; se non c'è, un jolly o uno senza ruolo, e solo in ultimo gli altri.
  const portiere = togli(
    restanti.find((g) => g.ruolo === 'portiere') ?? restanti.find((g) => g.ruolo === 'jolly') ?? restanti.find((g) => !g.ruolo) ?? restanti[0],
  )

  // Il modulo che lascia fuori ruolo meno giocatori; a parità, a caso.
  const quanti = LINEE.map((l) => restanti.filter((g) => g.ruolo === l).length)
  const fuoriRuolo = (m: number[]) => m.reduce((s, posti, i) => s + Math.max(0, quanti[i] - posti), 0)
  const opzioni = moduli(restanti.length)
  const meglio = Math.min(...opzioni.map(fuoriRuolo))
  const migliori = opzioni.filter((m) => fuoriRuolo(m) === meglio)
  const modulo = migliori[Math.floor(caso() * migliori.length)]

  // Prima ognuno nella sua linea, finché c'è posto.
  const linee: [G[], G[], G[]] = [[], [], []]
  for (const g of [...restanti]) {
    const i = LINEE.indexOf(g.ruolo ?? '')
    if (i >= 0 && linee[i].length < modulo[i]) {
      linee[i].push(g)
      togli(g)
    }
  }
  // Poi gli altri: chi ha un ruolo nella linea libera più vicina (un portiere in più va in difesa), jolly e senza ruolo dove resta posto.
  restanti.sort((a, b) => Number(LINEE.includes(b.ruolo ?? '') || b.ruolo === 'portiere') - Number(LINEE.includes(a.ruolo ?? '') || a.ruolo === 'portiere'))
  for (const g of restanti) {
    const da = g.ruolo === 'portiere' ? 0 : Math.max(LINEE.indexOf(g.ruolo ?? ''), 0)
    const libere = [0, 1, 2].filter((i) => linee[i].length < modulo[i]).sort((a, b) => Math.abs(a - da) - Math.abs(b - da))
    linee[libere[0]].push(g)
  }

  return { portiere, linee, modulo: modulo.filter(Boolean).join('-') }
}
