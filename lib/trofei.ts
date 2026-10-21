import 'server-only'
import { sanity } from './sanity'

// Trofei sbloccabili: si calcolano da soli dalle partite giocate della lega.
export const TROFEI = {
  tripletta: { emoji: '⚽', nome: 'Bomber', descrizione: 'Segna 3 gol in una sola partita.' },
  presente: { emoji: '🔥', nome: 'Leader', descrizione: 'Gioca 10 partite di fila della lega, senza saltarne una.' },
  peperone: { emoji: '🫑', nome: 'Golden Peperone', descrizione: 'Vinci il premio MVP 🫑 per 3 volte.' },
  maratoneta: { emoji: '🏃', nome: 'Maratoneta', descrizione: 'Corri più di 7 km in una partita (km presi da Apple Health o Health Connect).' },
  muro: { emoji: '🧱', nome: 'Muro', descrizione: 'Finisci una partita senza subire gol con la tua squadra.' },
  freddoloso: {
    emoji: '🥶',
    nome: 'Freddoloso',
    descrizione: 'Salta più di 3 partite della lega in un inverno (dicembre, gennaio e febbraio). Non è un complimento!',
  },
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
  distanze?: { id: string; km: number }[]
}

// L'inverno di una data (dicembre, gennaio, febbraio): l'anno in cui comincia, es. "2026" per dic 2026 – feb 2027.
function inverno(iso: string) {
  const mese = Number(iso.slice(5, 7))
  const anno = Number(iso.slice(0, 4))
  if (mese === 12) return anno
  if (mese <= 2) return anno - 1
  return null
}

export async function trofeiLega(legaId: string): Promise<Map<string, Sbloccati>> {
  // giocatori attivi e da quando sono nella lega (per il Freddoloso contano solo le partite dopo)
  const rosa = await sanity.fetch<{ _id: string; dal: string }[]>(
    `*[_type == "player" && lega._ref == $legaId && attivo != false]{_id, "dal": _createdAt}`,
    { legaId },
  )
  const partite = await sanity.fetch<Giocata[]>(
    `*[_type == "match" && lega._ref == $legaId && stato == "giocata" && defined(risultato.golA)] | order(data asc){
      data, "a": squadraA[]._ref, "b": squadraB[]._ref, "golA": risultato.golA, "golB": risultato.golB,
      "marcatori": marcatori[]{"id": giocatore._ref, gol}, "mvp": mvp._ref,
      "distanze": distanze[]{"id": giocatore._ref, km}
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
  const saltateInverno = new Map<string, number>() // "giocatore|inverno" → partite saltate

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
    if (p.golB === 0) for (const id of p.a ?? []) segna(id, 'muro', p.data)
    if (p.golA === 0) for (const id of p.b ?? []) segna(id, 'muro', p.data)
    // Freddoloso: partite d'inverno saltate (la quarta sblocca il trofeo per quell'inverno)
    const stagione = inverno(p.data)
    if (stagione != null) {
      for (const g of rosa) {
        if (inCampo.has(g._id) || g.dal > p.data) continue
        const chiave = `${g._id}|${stagione}`
        const n = (saltateInverno.get(chiave) ?? 0) + 1
        saltateInverno.set(chiave, n)
        if (n === 4) segna(g._id, 'freddoloso', p.data)
      }
    }
    // presenze di fila: chi non ha giocato questa partita riparte da zero
    for (const id of new Set([...serie.keys(), ...inCampo])) {
      const n = inCampo.has(id) ? (serie.get(id) ?? 0) + 1 : 0
      serie.set(id, n)
      if (n > 0 && n % 10 === 0) segna(id, 'presente', p.data)
    }
  }
  return tutti
}
