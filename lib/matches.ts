import 'server-only'
import { sanity } from './sanity'
import { playerFields, type Player } from './roster'

export type Risposta = 'presente' | 'assente' | 'riserva'
export type Stato = 'aperta' | 'chiusa' | 'giocata' | 'annullata'

export type Convocazione = {
  _key: string
  giocatore: Player
  risposta: Risposta
  rispostoIl?: string
  /** Messo in lista dall'organizzatore pescandolo dalla lista d'attesa. */
  aggiunto?: boolean
}

export type Match = {
  _id: string
  _rev: string
  data: string
  luogo: string
  serieId?: string
  notificaInviataIl?: string
  aperturaConvocazioni: string
  chiusuraConvocazioni: string
  postiDisponibili: number
  quota?: number
  stato: Stato
  note?: string
  convocazioni: Convocazione[]
  squadraA: Player[]
  squadraB: Player[]
  risultato?: { golA?: number; golB?: number }
  durataMinuti: number
  marcatori: { giocatoreId: string; gol: number }[]
  autogolA?: number
  autogolB?: number
  mvpId?: string
}

const matchFields = `
  _id, _rev, data, luogo, postiDisponibili, quota, note, aperturaConvocazioni, chiusuraConvocazioni, "serieId": serie._ref, notificaInviataIl,
  "stato": coalesce(stato, "aperta"),
  "convocazioni": coalesce(convocazioni[]{_key, risposta, rispostoIl, aggiunto, "giocatore": giocatore->{${playerFields}}}, []),
  "squadraA": coalesce(squadraA[]->{${playerFields}}, []),
  "squadraB": coalesce(squadraB[]->{${playerFields}}, []),
  risultato, autogolA, autogolB,
  "durataMinuti": coalesce(durataMinuti, 60),
  "marcatori": coalesce(marcatori[]{"giocatoreId": giocatore._ref, gol}, []),
  "mvpId": mvp._ref
`

export function getUpcomingMatches() {
  return sanity.fetch<Match[]>(
    `*[_type == "match" && coalesce(stato, "aperta") in ["aperta", "chiusa"]] | order(data asc){${matchFields}}`,
  )
}

export function getPastMatches(limit = 20) {
  return sanity.fetch<Match[]>(
    `*[_type == "match" && stato in ["giocata", "annullata"]] | order(data desc)[0...$limit]{${matchFields}}`,
    { limit },
  )
}

export function getMatch(id: string) {
  return sanity.fetch<Match | null>(`*[_type == "match" && _id == $id][0]{${matchFields}}`, { id })
}

export function getPlayers() {
  return sanity.fetch<Player[]>(`*[_type == "player"] | order(attivo desc, nome asc){${playerFields}}`)
}

export function getPlayer(id: string) {
  return sanity.fetch<Player | null>(`*[_type == "player" && _id == $id][0]{${playerFields}}`, { id })
}

export type PlayerStats = { giocate: number; vinte: number; pari: number; perse: number; gol: number; gs: number; mvp: number }

const vuote = (): PlayerStats => ({ giocate: 0, vinte: 0, pari: 0, perse: 0, gol: 0, gs: 0, mvp: 0 })

// Statistiche di tutti i giocatori dalle partite giocate:
// gol = gol segnati, gs = gol subiti dalla sua squadra, mvp = volte MVP.
export async function getAllStats(): Promise<Map<string, PlayerStats>> {
  const matches = await sanity.fetch<
    { a: string[]; b: string[]; golA?: number; golB?: number; marcatori: { id: string; gol: number }[]; mvp?: string }[]
  >(`*[_type == "match" && stato == "giocata" && defined(risultato.golA)]{
    "a": coalesce(squadraA[]._ref, []), "b": coalesce(squadraB[]._ref, []),
    "golA": risultato.golA, "golB": risultato.golB,
    "marcatori": coalesce(marcatori[]{"id": giocatore._ref, gol}, []), "mvp": mvp._ref
  }`)

  const stats = new Map<string, PlayerStats>()
  const get = (id: string) => stats.get(id) ?? stats.set(id, vuote()).get(id)!
  for (const m of matches) {
    const golA = m.golA ?? 0
    const golB = m.golB ?? 0
    for (const [squadra, fatti, subiti] of [
      [m.a, golA, golB],
      [m.b, golB, golA],
    ] as const) {
      for (const id of squadra) {
        const s = get(id)
        s.giocate++
        s.gs += subiti
        if (fatti > subiti) s.vinte++
        else if (fatti < subiti) s.perse++
        else s.pari++
      }
    }
    for (const g of m.marcatori) if (g.id) get(g.id).gol += g.gol ?? 0
    if (m.mvp) get(m.mvp).mvp++
  }
  return stats
}

export async function getPlayerStats(id: string): Promise<PlayerStats> {
  return (await getAllStats()).get(id) ?? vuote()
}

// Il risultato si può inserire 1 minuto dopo la fine prevista della partita.
export const risultatoDa = (m: Pick<Match, 'data' | 'durataMinuti'>) =>
  new Date(new Date(m.data).getTime() + ((m.durataMinuti ?? 60) + 1) * 60_000)

export const presenti = (m: Match) => m.convocazioni.filter((c) => c.risposta === 'presente' && c.giocatore)

export type Finestra = 'non_ancora' | 'aperta' | 'scaduta' | 'chiusa'

// Se i giocatori possono convocarsi adesso. "scaduta" = orario passato ma
// l'organizzatore non ha ancora chiuso ufficialmente le convocazioni.
export function finestra(m: Pick<Match, 'stato' | 'aperturaConvocazioni' | 'chiusuraConvocazioni'>, now = new Date()): Finestra {
  if (m.stato !== 'aperta') return 'chiusa'
  if (m.aperturaConvocazioni && now < new Date(m.aperturaConvocazioni)) return 'non_ancora'
  if (m.chiusuraConvocazioni && now >= new Date(m.chiusuraConvocazioni)) return 'scaduta'
  return 'aperta'
}

// Lista in ordine di arrivo: i primi N che hanno detto "ci sono" sono in lista,
// gli altri in lista d'attesa. Chi si cancella fa salire il primo in attesa.
// Chi è stato aggiunto dall'organizzatore resta in lista e occupa uno dei posti.
export function assegnaPosti<T extends { risposta: Risposta; rispostoIl?: string; aggiunto?: boolean }>(list: T[], posti: number): T[] {
  const inGioco = list
    .filter((c) => c.risposta !== 'assente')
    .sort((a, b) => Number(!!b.aggiunto) - Number(!!a.aggiunto) || (a.rispostoIl ?? '').localeCompare(b.rispostoIl ?? ''))
  const ruolo = new Map(inGioco.map((c, i) => [c, (i < posti ? 'presente' : 'riserva') as Risposta]))
  return list.map((c) => (ruolo.has(c) ? { ...c, risposta: ruolo.get(c)! } : c))
}

// Presenti e lista d'attesa nell'ordine in cui hanno risposto.
export function ordinati(m: Match, risposta: Risposta) {
  return m.convocazioni
    .filter((c) => c.risposta === risposta && c.giocatore)
    .sort((a, b) => (a.rispostoIl ?? '').localeCompare(b.rispostoIl ?? ''))
}

export function getMatchesBetween(from: string, to: string) {
  return sanity.fetch<Match[]>(`*[_type == "match" && data >= $from && data < $to] | order(data asc){${matchFields}}`, { from, to })
}

export type PartitaGiocata = {
  _id: string
  data: string
  luogo: string
  fatti: number
  subiti: number
  gol: number
  mvp: boolean
}

// Le ultime partite giocate da un giocatore, dal suo punto di vista.
export async function getStorico(id: string, limit = 10): Promise<PartitaGiocata[]> {
  const rows = await sanity.fetch<
    { _id: string; data: string; luogo: string; inA: boolean; golA: number; golB: number; gol?: number; mvp: boolean }[]
  >(
    `*[_type == "match" && stato == "giocata" && defined(risultato.golA) && $id in [...coalesce(squadraA[]._ref, []), ...coalesce(squadraB[]._ref, [])]]
      | order(data desc)[0...$limit]{
        _id, data, luogo,
        "inA": $id in squadraA[]._ref,
        "golA": risultato.golA, "golB": risultato.golB,
        "gol": marcatori[giocatore._ref == $id][0].gol,
        "mvp": mvp._ref == $id
      }`,
    { id, limit },
  )
  return rows.map((r) => ({
    _id: r._id,
    data: r.data,
    luogo: r.luogo,
    fatti: r.inA ? r.golA : r.golB,
    subiti: r.inA ? r.golB : r.golA,
    gol: r.gol ?? 0,
    mvp: !!r.mvp,
  }))
}
