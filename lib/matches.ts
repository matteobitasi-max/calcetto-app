import 'server-only'
import { sanity } from './sanity'
import { playerFields, type Player } from './roster'
import type { PartitaPunteggio } from './punteggio'
import { formatoDaIscritti } from './limiti'

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
  legaId: string
  data: string
  luogo: string
  serieId?: string
  notificaInviataIl?: string
  aperturaConvocazioni: string
  chiusuraConvocazioni: string
  durataFinestraMinuti?: number
  postiDisponibili: number
  /** Numero deciso dalle convocazioni: pari alla chiusura. */
  postiAutomatici?: boolean
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
  pagamenti: Pagamento[]
  pettorine?: 'A' | 'B'
  formazioniUfficialiIl?: string
  distanze: Distanza[]
}

export type FonteKm = 'strava' | 'salute' | 'manuale'
export type Distanza = { giocatoreId: string; km: number; fonte?: FonteKm }

// Inizio e fine della partita (per cercare i km registrati in quell'orario).
export const orarioPartita = (m: Pick<Match, 'data' | 'durataMinuti'>) => {
  const inizio = new Date(m.data)
  return { inizio, fine: new Date(inizio.getTime() + (m.durataMinuti ?? 60) * 60_000) }
}

export type Pagamento = { giocatoreId: string; stato: 'dichiarato' | 'confermato'; metodo?: 'satispay' | 'contanti'; il?: string }

const matchFields = `
  _id, _rev, "legaId": lega._ref, data, luogo, postiDisponibili, postiAutomatici, quota, note, aperturaConvocazioni, chiusuraConvocazioni, durataFinestraMinuti, "serieId": serie._ref, notificaInviataIl,
  "stato": coalesce(stato, "aperta"),
  "convocazioni": coalesce(convocazioni[]{_key, risposta, rispostoIl, aggiunto, "giocatore": giocatore->{${playerFields}}}, []),
  "squadraA": coalesce(squadraA[]->{${playerFields}}, []),
  "squadraB": coalesce(squadraB[]->{${playerFields}}, []),
  risultato, autogolA, autogolB,
  "durataMinuti": coalesce(durataMinuti, 60),
  "marcatori": coalesce(marcatori[]{"giocatoreId": giocatore._ref, gol}, []),
  "mvpId": mvp._ref,
  "pagamenti": coalesce(pagamenti[]{"giocatoreId": giocatore._ref, stato, metodo, il}, []),
  pettorine, formazioniUfficialiIl,
  "distanze": coalesce(distanze[]{"giocatoreId": giocatore._ref, km, fonte}, [])
`

// Le partite di una lega o, con un elenco, di più leghe insieme (vista "Tutte le leghe").
export function getUpcomingMatches(legaId: string | string[]) {
  return sanity.fetch<Match[]>(
    `*[_type == "match" && lega._ref in $leghe && coalesce(stato, "aperta") in ["aperta", "chiusa"]] | order(data asc){${matchFields}}`,
    { leghe: [legaId].flat() },
  )
}

export function getPastMatches(legaId: string | string[], limit = 20) {
  return sanity.fetch<Match[]>(
    `*[_type == "match" && lega._ref in $leghe && stato in ["giocata", "annullata"]] | order(data desc)[0...$limit]{${matchFields}}`,
    { leghe: [legaId].flat(), limit },
  )
}

export function getMatch(id: string) {
  return sanity.fetch<Match | null>(`*[_type == "match" && _id == $id][0]{${matchFields}}`, { id })
}

export function getPlayers(legaId: string) {
  return sanity.fetch<Player[]>(`*[_type == "player" && lega._ref == $legaId] | order(attivo desc, nome asc){${playerFields}}`, { legaId })
}

export function getPlayer(id: string) {
  return sanity.fetch<Player | null>(`*[_type == "player" && _id == $id][0]{${playerFields}}`, { id })
}

export type PlayerStats = { giocate: number; vinte: number; pari: number; perse: number; gol: number; gs: number; mvp: number }

const vuote = (): PlayerStats => ({ giocate: 0, vinte: 0, pari: 0, perse: 0, gol: 0, gs: 0, mvp: 0 })

// Statistiche di tutti i giocatori dalle partite giocate:
// gol = gol segnati, gs = gol subiti dalla sua squadra, mvp = volte MVP.
export async function getAllStats(legaId: string): Promise<Map<string, PlayerStats>> {
  const matches = await sanity.fetch<
    { a: string[]; b: string[]; golA?: number; golB?: number; marcatori: { id: string; gol: number }[]; mvp?: string }[]
  >(`*[_type == "match" && lega._ref == $legaId && stato == "giocata" && defined(risultato.golA)]{
    "a": coalesce(squadraA[]._ref, []), "b": coalesce(squadraB[]._ref, []),
    "golA": risultato.golA, "golB": risultato.golB,
    "marcatori": coalesce(marcatori[]{"id": giocatore._ref, gol}, []), "mvp": mvp._ref
  }`, { legaId })

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

export async function getPlayerStats(id: string, legaId: string): Promise<PlayerStats> {
  return (await getAllStats(legaId)).get(id) ?? vuote()
}

// Il risultato si può inserire 1 minuto dopo la fine prevista della partita.
export const risultatoDa = (m: Pick<Match, 'data' | 'durataMinuti'>) =>
  new Date(new Date(m.data).getTime() + ((m.durataMinuti ?? 60) + 1) * 60_000)

export const presenti = (m: Match) => m.convocazioni.filter((c) => c.risposta === 'presente' && c.giocatore)

export { finestra, type Finestra } from './finestra'

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

export function getMatchesBetween(legaId: string | string[], from: string, to: string) {
  return sanity.fetch<Match[]>(
    `*[_type == "match" && lega._ref in $leghe && data >= $from && data < $to] | order(data asc){${matchFields}}`,
    { leghe: [legaId].flat(), from, to },
  )
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

// Le partite giocate della lega, in ordine di data, per la classifica a punti.
export function getPartitePunteggio(legaId: string) {
  return sanity.fetch<PartitaPunteggio[]>(
    `*[_type == "match" && lega._ref == $legaId && stato == "giocata" && defined(risultato.golA)] | order(data asc){
      "a": coalesce(squadraA[]._ref, []), "b": coalesce(squadraB[]._ref, []),
      "golA": risultato.golA, "golB": risultato.golB,
      "marcatori": coalesce(marcatori[]{"id": giocatore._ref, gol}, []), "mvp": mvp._ref
    }`,
    { legaId },
  )
}

// Per le partite "in base alle convocazioni" ancora aperte: iscritti e formato se si chiudesse adesso.
export function formatoInCorso(m: Match) {
  if (!m.postiAutomatici || m.stato !== 'aperta') return null
  const iscritti = m.convocazioni.filter((c) => c.risposta !== 'assente' && c.giocatore).length
  return { iscritti, ...formatoDaIscritti(iscritti) }
}

// Km totali di ogni giocatore nelle partite giocate della lega.
export async function getKmTotali(legaId: string) {
  const partite = await sanity.fetch<{ d: { id: string; km: number }[] }[]>(
    `*[_type == "match" && lega._ref == $legaId && stato == "giocata" && count(distanze) > 0]{"d": distanze[]{"id": giocatore._ref, km}}`,
    { legaId },
  )
  const totali = new Map<string, { km: number; partite: number }>()
  for (const { d } of partite) {
    for (const { id, km } of d) {
      const t = totali.get(id) ?? { km: 0, partite: 0 }
      totali.set(id, { km: t.km + km, partite: t.partite + 1 })
    }
  }
  return totali
}
