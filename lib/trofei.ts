import 'server-only'
import { sanity } from './sanity'

// Trofei sbloccabili: si calcolano da soli dalle partite giocate della lega.
export const TROFEI = {
  tripletta: { emoji: '⚽', nome: 'Tripletta', descrizione: 'Segna 3 gol in una sola partita.' },
  presente: { emoji: '🔥', nome: 'Sempre presente', descrizione: 'Gioca 10 partite di fila della lega, senza saltarne una.' },
  peperone: { emoji: '🫑', nome: "Peperone d'oro", descrizione: 'Vinci il premio MVP 🫑 per 3 volte.' },
  maratoneta: { emoji: '🏃', nome: 'Maratoneta', descrizione: 'Corri più di 7 km in una partita (km presi da Apple Salute o Health Connect).' },
  puntuale: { emoji: '💶', nome: 'Puntuale', descrizione: 'Paga la quota prima che la partita inizi.' },
  muro: { emoji: '🧱', nome: 'Muro', descrizione: 'Finisci una partita senza subire gol con la tua squadra.' },
} as const
export type IdTrofeo = keyof typeof TROFEI

// Per ogni trofeo sbloccato: quando la prima volta e quante volte in tutto.
export type Sbloccati = Partial<Record<IdTrofeo, { il: string; volte: number }>>

type Giocata = {
  data: string
  a?: string[]
  b?: string[]
  golA?: number
  golB?: number
  marcatori?: { id: string; gol: number }[]
  mvp?: string
  pagamenti?: { id: string; il?: string }[]
  distanze?: { id: string; km: number }[]
}

export async function trofeiLega(legaId: string): Promise<Map<string, Sbloccati>> {
  const partite = await sanity.fetch<Giocata[]>(
    `*[_type == "match" && lega._ref == $legaId && stato == "giocata" && defined(risultato.golA)] | order(data asc){
      data, "a": squadraA[]._ref, "b": squadraB[]._ref, "golA": risultato.golA, "golB": risultato.golB,
      "marcatori": marcatori[]{"id": giocatore._ref, gol}, "mvp": mvp._ref,
      "pagamenti": pagamenti[]{"id": giocatore._ref, il}, "distanze": distanze[]{"id": giocatore._ref, km}
    }`,
    { legaId },
  )
  const tutti = new Map<string, Sbloccati>()
  const segna = (id: string, t: IdTrofeo, il: string, quante = 1) => {
    const s = tutti.get(id) ?? {}
    s[t] = s[t] ? { il: s[t]!.il, volte: s[t]!.volte + quante } : { il, volte: quante }
    tutti.set(id, s)
  }
  const mvp = new Map<string, number>()
  const serie = new Map<string, number>()

  for (const p of partite) {
    const inCampo = new Set([...(p.a ?? []), ...(p.b ?? [])])
    for (const m of p.marcatori ?? []) if (m.gol >= 3) segna(m.id, 'tripletta', p.data)
    if (p.mvp) {
      const n = (mvp.get(p.mvp) ?? 0) + 1
      mvp.set(p.mvp, n)
      if (n === 3) segna(p.mvp, 'peperone', p.data)
      else if (n > 3 && n % 3 === 0) segna(p.mvp, 'peperone', p.data) // ogni 3 MVP un altro peperone
    }
    for (const d of p.distanze ?? []) if (d.km > 7) segna(d.id, 'maratoneta', p.data)
    for (const pg of p.pagamenti ?? []) if (pg.il && pg.il < p.data && inCampo.has(pg.id)) segna(pg.id, 'puntuale', p.data)
    if (p.golB === 0) for (const id of p.a ?? []) segna(id, 'muro', p.data)
    if (p.golA === 0) for (const id of p.b ?? []) segna(id, 'muro', p.data)
    // presenze di fila: chi non ha giocato questa partita riparte da zero
    for (const id of new Set([...serie.keys(), ...inCampo])) {
      const n = inCampo.has(id) ? (serie.get(id) ?? 0) + 1 : 0
      serie.set(id, n)
      if (n > 0 && n % 10 === 0) segna(id, 'presente', p.data)
    }
  }
  return tutti
}
