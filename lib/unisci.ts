import type { Risposta } from './matches'

type Ref = { _type: 'reference'; _ref: string; _key?: string }
export type MatchDaUnire = {
  _id: string
  _rev: string
  convocazioni?: { _key: string; giocatore: Ref; risposta: Risposta; rispostoIl?: string; aggiunto?: boolean }[]
  squadraA?: Ref[]
  squadraB?: Ref[]
  marcatori?: { _key: string; giocatore: Ref; gol: number }[]
  mvp?: Ref
  pagamenti?: { _key: string; giocatore: Ref; stato: string; metodo?: string; il?: string }[]
}

// Riporta su "tieni" tutto quello che in una partita apparteneva a "togli", senza doppioni.
export function riscriviPartita(m: MatchDaUnire, tieni: string, togli: string) {
  const r = (id: string) => (id === togli ? tieni : id)
  const conv = m.convocazioni ?? []
  const haTieni = conv.some((c) => c.giocatore?._ref === tieni)
  const convocazioni = conv
    .filter((c) => !(c.giocatore?._ref === togli && haTieni)) // se c'erano entrambi, vale la risposta della scheda giusta
    .map((c) => (c.giocatore?._ref === togli ? { ...c, giocatore: { _type: 'reference' as const, _ref: tieni } } : c))
  const squadra = (s?: Ref[]) => {
    const visti = new Set<string>()
    return (s ?? [])
      .map((x) => ({ ...x, _ref: r(x._ref), _key: x._key === togli ? tieni : x._key }))
      .filter((x) => !visti.has(x._ref) && visti.add(x._ref))
  }
  const gol = new Map<string, number>()
  for (const g of m.marcatori ?? []) gol.set(r(g.giocatore._ref), (gol.get(r(g.giocatore._ref)) ?? 0) + (g.gol ?? 0))
  const pagamenti = new Map<string, NonNullable<MatchDaUnire['pagamenti']>[number]>()
  for (const p of m.pagamenti ?? []) {
    const id = r(p.giocatore._ref)
    if (!pagamenti.has(id) || p.giocatore._ref === tieni) pagamenti.set(id, { ...p, _key: id, giocatore: { _type: 'reference', _ref: id } })
  }
  return {
    convocazioni,
    squadraA: squadra(m.squadraA),
    squadraB: squadra(m.squadraB),
    marcatori: [...gol].map(([id, n]) => ({ _key: id, _type: 'marcatore', giocatore: { _type: 'reference', _ref: id }, gol: n })),
    pagamenti: [...pagamenti.values()],
    ...(m.mvp && { mvp: { _type: 'reference' as const, _ref: r(m.mvp._ref) } }),
  }
}
