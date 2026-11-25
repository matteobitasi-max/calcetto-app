import 'server-only'
import type { Campo } from './campo'
import type { Periodo } from './stagioni'
import { sanity } from './sanity'
import { playerFields, type Player } from './roster'
import type { PartitaPunteggio } from './punteggio'
import type { PartitaForma } from './forma'
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
  legaNome?: string
  /** Il posto scelto dalla mappa (indirizzo e coordinate), se c'è. */
  campo?: Campo
  /** Il campo prenotato su The Cap (gestionale del centro): stato della prenotazione. */
  prenotazione?: { _id: string; stato: 'confermata' | 'richiesta' | 'annullata' | 'rifiutata'; centro?: string } | null
  /** Allenamento: convocazioni come una partita, ma niente squadre, risultato né classifica. */
  tipo?: 'allenamento'
  /** La lega è una "Squadra" (Club) in cui convoca l'allenatore: le partite hanno i convocati scelti da lui. */
  squadra?: boolean
  /** Leghe "Squadra" con le pagelle: a fine partita l'allenatore dà voto e nota a chi era in lista. */
  pagelleAttive?: boolean
  /** Lega Club: formato e modulo preferito della lega, e la formazione titolare della partita. */
  club?: boolean
  formato?: number
  moduloLega?: string
  formazione?: { modulo: string; posti: { posto: number; id: string }[] }
  pagelle: Pagella[]
  /** Convocati scelti dall'allenatore (id dei giocatori): solo loro possono rispondere. */
  convocati?: string[]
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
  /** Partita di un torneo: squadre fisse con nome, niente convocazioni. */
  torneo?: { _id: string; nome: string; formato: 'girone' | 'eliminazione' | 'gironi' }
  /** Gironi + tabellone: la fase della partita e il suo girone. */
  fase?: 'gironi' | 'eliminazione'
  girone?: string
  turno?: number
  /** Tabellone: posizione dell'incrocio nel turno e, in caso di pareggio, chi passa. */
  posizione?: number
  passa?: 'A' | 'B'
  chiaveA?: string
  chiaveB?: string
  nomeA?: string
  nomeB?: string
}

// Pagella dell'allenatore: voto da 1 a 10 (a mezzi punti) e nota, visibile solo al giocatore e agli organizzatori.
export type Pagella = { giocatoreId: string; voto: number; nota?: string }

export type FonteKm = 'strava' | 'salute' | 'manuale'
export type Distanza = { giocatoreId: string; km: number; fonte?: FonteKm }

// Inizio e fine della partita (per cercare i km registrati in quell'orario).
export const orarioPartita = (m: Pick<Match, 'data' | 'durataMinuti'>) => {
  const inizio = new Date(m.data)
  return { inizio, fine: new Date(inizio.getTime() + (m.durataMinuti ?? 60) * 60_000) }
}

export const isAllenamento = (m: Pick<Match, 'tipo'>) => m.tipo === 'allenamento'
// Partita di una lega "Squadra": risponde solo chi l'allenatore ha convocato (gli allenamenti restano aperti a tutti).
export const conSelezione = (m: Pick<Match, 'squadra' | 'tipo' | 'torneo'>) => !!m.squadra && m.tipo !== 'allenamento' && !m.torneo
// Un allenamento finito (passato l'orario) è concluso anche senza risultato: va tra le partite passate.
export const allenamentoFinito = (m: Pick<Match, 'tipo' | 'data' | 'durataMinuti' | 'stato'>, ora = new Date()) =>
  isAllenamento(m) && m.stato !== 'annullata' && orarioPartita(m).fine <= ora

export type Pagamento = { giocatoreId: string; stato: 'dichiarato' | 'confermato'; metodo?: 'satispay' | 'contanti'; il?: string }

const matchFields = `
  _id, _rev, "legaId": lega._ref, "legaNome": lega->nome, tipo, campo,
  "prenotazione": prenotazione->{_id, "stato": coalesce(stato, "confermata"), "centro": centro->nome}, "squadra": lega->club == true && lega->tipo == "squadra" && lega->autoconvocazione != true, "pagelleAttive": lega->club == true && lega->tipo == "squadra" && lega->pagelle != false, "club": lega->club == true && lega->tipo == "squadra", "formato": lega->formato, "moduloLega": lega->modulo, "formazione": formazione{modulo, "posti": posti[]{posto, "id": giocatore._ref}}, "pagelle": coalesce(pagelle[]{"giocatoreId": giocatore._ref, voto, nota}, []), "convocati": convocati[]._ref, data, luogo, postiDisponibili, postiAutomatici, quota, note, aperturaConvocazioni, chiusuraConvocazioni, durataFinestraMinuti, "serieId": serie._ref, notificaInviataIl,
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
  "distanze": coalesce(distanze[]{"giocatoreId": giocatore._ref, km, fonte}, []),
  "torneo": torneo->{_id, nome, "formato": coalesce(formato, "girone")}, turno, fase, girone, posizione, passa, chiaveA, chiaveB, nomeA, nomeB
`

// Le partite di una lega o, con un elenco, di più leghe insieme (vista "Tutte le leghe").
// In programma: aperte o chiuse (le partite restano qui finché non si inserisce il risultato),
// tranne gli allenamenti già finiti, che non hanno un risultato da aspettare.
export async function getUpcomingMatches(legaId: string | string[]) {
  const partite = await sanity.fetch<Match[]>(
    `*[_type == "match" && lega._ref in $leghe && coalesce(stato, "aperta") in ["aperta", "chiusa"]] | order(data asc){${matchFields}}`,
    { leghe: [legaId].flat() },
  )
  return partite.filter((m) => !allenamentoFinito(m))
}

// Concluse: giocate, annullate e allenamenti finiti.
export async function getPastMatches(legaId: string | string[], limit = 20) {
  const partite = await sanity.fetch<Match[]>(
    `*[_type == "match" && lega._ref in $leghe && (stato in ["giocata", "annullata"] || (tipo == "allenamento" && data < $ora))] | order(data desc)[0...$limit]{${matchFields}}`,
    { leghe: [legaId].flat(), limit, ora: new Date().toISOString() },
  )
  return partite.filter((m) => m.stato === 'giocata' || m.stato === 'annullata' || allenamentoFinito(m))
}

// Le partite di un torneo, per giornata.
export function getPartiteTorneo(torneoId: string) {
  return sanity.fetch<Match[]>(`*[_type == "match" && torneo._ref == $torneoId] | order(turno asc, data asc){${matchFields}}`, { torneoId })
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

// Solo le partite di un periodo (una stagione): filtro e parametri da aggiungere alla ricerca.
const nelPeriodo = (p?: Periodo) => `${p?.dal ? ' && data >= $dal' : ''}${p?.al ? ' && data < $al' : ''}`
const parametriPeriodo = (p?: Periodo) => ({ ...(p?.dal && { dal: p.dal }), ...(p?.al && { al: p.al }) })

// Statistiche di tutti i giocatori dalle partite giocate:
// gol = gol segnati, gs = gol subiti dalla sua squadra, mvp = volte MVP.
export async function getAllStats(legaId: string, periodo?: Periodo): Promise<Map<string, PlayerStats>> {
  const matches = await sanity.fetch<
    { a: string[]; b: string[]; golA?: number; golB?: number; marcatori: { id: string; gol: number }[]; mvp?: string }[]
  >(`*[_type == "match" && lega._ref == $legaId${nelPeriodo(periodo)} && stato == "giocata" && defined(risultato.golA)]{
    "a": coalesce(squadraA[]._ref, []), "b": coalesce(squadraB[]._ref, []),
    "golA": risultato.golA, "golB": risultato.golB,
    "marcatori": coalesce(marcatori[]{"id": giocatore._ref, gol}, []), "mvp": mvp._ref
  }`, { legaId, ...parametriPeriodo(periodo) })

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
export function getPartitePunteggio(legaId: string, periodo?: Periodo) {
  return sanity.fetch<PartitaPunteggio[]>(
    `*[_type == "match" && lega._ref == $legaId${nelPeriodo(periodo)} && stato == "giocata" && defined(risultato.golA)] | order(data asc){
      "a": coalesce(squadraA[]._ref, []), "b": coalesce(squadraB[]._ref, []),
      "golA": risultato.golA, "golB": risultato.golB,
      "marcatori": coalesce(marcatori[]{"id": giocatore._ref, gol}, []), "mvp": mvp._ref
    }`,
    { legaId, ...parametriPeriodo(periodo) },
  )
}

// Per le partite "in base alle convocazioni" ancora aperte: iscritti e formato se si chiudesse adesso.
export function formatoInCorso(m: Match) {
  if (!m.postiAutomatici || m.stato !== 'aperta') return null
  const iscritti = m.convocazioni.filter((c) => c.risposta !== 'assente' && c.giocatore).length
  return { iscritti, ...formatoDaIscritti(iscritti, m.postiDisponibili) }
}

// Pagelle di tutta la lega: media e numero di voti per giocatore.
export async function getPagelleLega(legaId: string, periodo?: Periodo) {
  const voti = await sanity.fetch<{ id: string; voto: number }[]>(
    `*[_type == "match" && lega._ref == $legaId${nelPeriodo(periodo)} && coalesce(stato, "aperta") != "annullata" && count(pagelle) > 0].pagelle[]{"id": giocatore._ref, voto}`,
    { legaId, ...parametriPeriodo(periodo) },
  )
  const per = new Map<string, { somma: number; n: number }>()
  for (const v of voti) {
    if (typeof v.voto !== 'number') continue
    const x = per.get(v.id) ?? { somma: 0, n: 0 }
    per.set(v.id, { somma: x.somma + v.voto, n: x.n + 1 })
  }
  return new Map([...per].map(([id, x]) => [id, { media: x.somma / x.n, n: x.n }]))
}

// Presenze agli allenamenti già fatti (non annullati): quanti allenamenti in tutto e quanti per giocatore (in lista).
export async function getPresenzeAllenamenti(legaId: string, periodo?: Periodo) {
  const allenamenti = await sanity.fetch<{ presenti: string[] | null }[]>(
    `*[_type == "match" && lega._ref == $legaId${nelPeriodo(periodo)} && tipo == "allenamento" && coalesce(stato, "aperta") != "annullata" && data < $ora]{
      "presenti": convocazioni[risposta == "presente"].giocatore._ref
    }`,
    { legaId, ora: new Date().toISOString(), ...parametriPeriodo(periodo) },
  )
  const per = new Map<string, number>()
  for (const a of allenamenti) for (const id of a.presenti ?? []) per.set(id, (per.get(id) ?? 0) + 1)
  return { totale: allenamenti.length, per }
}

// Pagelle dell'allenatore di un giocatore nella lega: media e numero di partite (le più recenti per prime).
export async function getPagelleGiocatore(legaId: string, giocatoreId: string) {
  const voti = await sanity.fetch<{ voto: number; data: string }[]>(
    `*[_type == "match" && lega._ref == $legaId && coalesce(stato, "aperta") != "annullata" && $id in pagelle[].giocatore._ref] | order(data desc){
      data, "voto": pagelle[giocatore._ref == $id][0].voto
    }`,
    { legaId, id: giocatoreId },
  )
  const validi = voti.filter((v) => typeof v.voto === 'number')
  return { media: validi.length ? validi.reduce((s, v) => s + v.voto, 0) / validi.length : null, partite: validi.length, ultimi: validi.slice(0, 5).map((v) => v.voto) }
}

// Km totali di ogni giocatore nelle partite della lega. Contano tutte quelle non annullate, anche senza
// risultato inserito: i km ci sono solo a partita finita e non dipendono dal risultato.
export async function getKmTotali(legaId: string, periodo?: Periodo) {
  const partite = await sanity.fetch<{ d: { id: string; km: number }[] }[]>(
    `*[_type == "match" && lega._ref == $legaId${nelPeriodo(periodo)} && coalesce(stato, "aperta") != "annullata" && count(distanze) > 0]{"d": distanze[]{"id": giocatore._ref, km}}`,
    { legaId, ...parametriPeriodo(periodo) },
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

// La partita in cui qualcuno ha corso di più nella lega (record), e i km totali di tutta la lega.
export async function getKmRecord(legaId: string, periodo?: Periodo) {
  return sanity.fetch<{ record: { id: string; km: number; data: string } | null; totale: number }>(
    `{
      "record": *[_type == "match" && lega._ref == $legaId${nelPeriodo(periodo)} && coalesce(stato, "aperta") != "annullata" && count(distanze) > 0]{data, "d": distanze[]{"id": giocatore._ref, km}}
        {"migliore": d | order(km desc)[0], data} | order(migliore.km desc)[0]{"id": migliore.id, "km": migliore.km, data},
      "totale": math::sum(*[_type == "match" && lega._ref == $legaId${nelPeriodo(periodo)} && coalesce(stato, "aperta") != "annullata"].distanze[].km)
    }`,
    { legaId, ...parametriPeriodo(periodo) },
  )
}

// Le partite giocate di una lega, con solo quello che serve per la forma (Pro).
export function getPartitePerForma(legaId: string) {
  return sanity.fetch<PartitaForma[]>(
    `*[_type == "match" && lega._ref == $legaId && stato == "giocata"] | order(data asc){
      _id, data, risultato, "mvpId": mvp._ref,
      "squadraA": coalesce(squadraA[]._ref, []), "squadraB": coalesce(squadraB[]._ref, []),
      "marcatori": coalesce(marcatori[]{"giocatoreId": giocatore._ref, gol}, []),
      "distanze": coalesce(distanze[]{"giocatoreId": giocatore._ref, km}, [])
    }`,
    { legaId },
  )
}

// I campi già usati da una lega (i più recenti prima, uno per nome): li propone il modulo della partita,
// senza passare dalla ricerca su Google.
export async function campiUsati(legaId: string) {
  const righe = await sanity.fetch<{ luogo?: string; campo?: Campo }[]>(
    `*[_type == "match" && lega._ref == $legaId && defined(luogo) && !defined(torneo)] | order(data desc)[0...80]{luogo, campo}`,
    { legaId },
  )
  const visti = new Map<string, { luogo: string; campo?: Campo }>()
  for (const r of righe) {
    const luogo = r.luogo?.trim()
    if (!luogo) continue
    const chiave = luogo.toLowerCase()
    const gia = visti.get(chiave)
    // se lo stesso nome è stato scelto almeno una volta dalla mappa, vale il posto preciso
    if (!gia) visti.set(chiave, { luogo, ...(r.campo && { campo: r.campo }) })
    else if (!gia.campo && r.campo) gia.campo = r.campo
  }
  return [...visti.values()].slice(0, 8)
}
