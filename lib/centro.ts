import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { sanity } from './sanity'
import { getUtente } from './player'
import { addDays, isoToRomeLocal, romeLocalToISO } from './dates'
import type { Campo as PostoMappa } from './campo'
import { oreAperte, type Chiusura, type OrarioGiorno } from './orari-centro'
export { orarioDel, oreAperte } from './orari-centro'

// Il gestionale del centro sportivo: i campi del centro, le prenotazioni (planning), gli incassi e i numeri.
// Il centro è di chi l'ha creato e di chi lui aggiunge (gestori, per account). Le prenotazioni sono documenti
// a parte, una per campo e orario (anche quelle ripetute ogni settimana, legate da "serie").

export type TipoCampo = 5 | 6 | 7 | 8 | 9 | 11
export const TIPI_CAMPO: TipoCampo[] = [5, 6, 7, 8, 9, 11]
export const METODI = ['contanti', 'pos', 'satispay', 'bonifico'] as const
export type Metodo = (typeof METODI)[number]
export const NOME_METODO: Record<Metodo, string> = { contanti: '💶 Contanti', pos: '💳 POS', satispay: '📱 Satispay', bonifico: '🏦 Bonifico' }
export const DURATE = [60, 90, 120] as const

export type CampoCentro = { _key: string; nome: string; tipo: TipoCampo; coperto?: boolean; prezzoOra: number; attivo?: boolean }
export type Centro = {
  _id: string
  nome: string
  indirizzo?: string
  posto?: PostoMappa
  telefono?: string
  /** Orario di apertura e chiusura (HH:MM) di base; quello di ogni giorno della settimana è in "orari". */
  apre: string
  chiude: string
  orari?: OrarioGiorno[]
  /** Festività e chiusure straordinarie (dal … al, compresi). */
  chiusure: Chiusura[]
  campi: CampoCentro[]
  gestori: string[]
  /** Prenotazioni dall'app dei giocatori: confermate subito, da approvare (predefinito) o spente. */
  prenotazioniApp: ModoApp
}

export type ModoApp = 'auto' | 'richiesta' | 'spente'
export const MODI_APP: ModoApp[] = ['richiesta', 'auto', 'spente']

export type Prenotazione = {
  _id: string
  campo: string
  inizio: string
  fine: string
  cliente: string
  telefono?: string
  nota?: string
  prezzo: number
  /** "richiesta": arrivata dall'app, il centro deve confermarla (intanto il campo è tenuto). */
  stato: 'confermata' | 'richiesta' | 'annullata' | 'rifiutata'
  pagato?: { metodo: Metodo; il: string }
  serie?: string
  /** Prenotata dall'app: la lega, la partita e l'organizzatore (la sua scheda nella lega). */
  lega?: string
  matchId?: string
  organizzatoreId?: string
  /** Email di chi prenota (scritta dal centro): se è su The Cap, la prenotazione si collega alla sua partita. */
  email?: string
}

// Orari esclusi dalle prenotazioni dall'app (il centro li tiene per sé: manutenzione, scuola calcio, telefonate…).
// Dal gestionale si possono comunque prenotare.
export type BloccoApp = { _id: string; campo: string; inizio: string; fine: string; nota?: string }

export function blocchiTra(centroId: string, da: string, a: string) {
  return sanity.fetch<BloccoApp[]>(
    `*[_type == "bloccoApp" && centro._ref == $centro && inizio < $a && fine > $da] | order(inizio asc){_id, campo, inizio, fine, nota}`,
    { centro: centroId, da, a },
  )
}

// Gli stati che tengono occupato il campo (le richieste lo tengono finché il centro non risponde).
export const OCCUPANO = '["confermata", "richiesta"]'

const centroFields = `_id, nome, indirizzo, posto, telefono, "apre": coalesce(apre, "08:00"), "chiude": coalesce(chiude, "24:00"),
  "campi": coalesce(campi, []), "gestori": coalesce(gestori, []), "prenotazioniApp": coalesce(prenotazioniApp, "richiesta"),
  orari, "chiusure": coalesce(chiusure, [])`
const prenotazioneFields = `_id, campo, inizio, fine, cliente, telefono, nota, prezzo, "stato": coalesce(stato, "confermata"), pagato, "serie": serie,
  "lega": lega->nome, "matchId": match._ref, "organizzatoreId": organizzatore._ref, email`

// Il centro che gestisco (il primo, se ne gestissi più d'uno).
export const getMioCentro = cache(async (): Promise<Centro | null> => {
  const utente = await getUtente()
  if (!utente) return null
  return sanity.fetch<Centro | null>(`*[_type == "centro" && $id in gestori] | order(_createdAt asc)[0]{${centroFields}}`, { id: utente.id })
})

// Per le pagine del gestionale: senza centro si va a crearlo.
export async function requireCentro() {
  const centro = await getMioCentro()
  if (!centro) redirect('/centro/nuovo')
  return centro
}

// I campi in uso, nell'ordine in cui sono stati aggiunti.
export const campiAttivi = (c: Centro) => c.campi.filter((x) => x.attivo !== false)

// Orari in minuti dalla mezzanotte ("24:00" = 1440).
export const minuti = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + (m || 0)
}
export const hhmm = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

// Inizio e fine di un giorno (AAAA-MM-GG, ora italiana) in ISO.
export const giornoISO = (giorno: string) => ({ da: romeLocalToISO(`${giorno}T00:00`), a: romeLocalToISO(`${addDays(giorno, 1)}T00:00`) })
export const oggiRoma = () => isoToRomeLocal(new Date()).slice(0, 10)

export function prenotazioniTra(centroId: string, da: string, a: string, conAnnullate = false) {
  return sanity.fetch<Prenotazione[]>(
    `*[_type == "prenotazione" && centro._ref == $centro && inizio < $a && fine > $da ${conAnnullate ? '' : `&& coalesce(stato, "confermata") in ${OCCUPANO}`}] | order(inizio asc){${prenotazioneFields}}`,
    { centro: centroId, da, a },
  )
}

export function getPrenotazione(centroId: string, id: string) {
  return sanity.fetch<Prenotazione | null>(`*[_type == "prenotazione" && _id == $id && centro._ref == $centro][0]{${prenotazioneFields}}`, { id, centro: centroId })
}

// Le prenotazioni già giocate e non ancora pagate (le più vecchie prima).
export function daIncassare(centroId: string) {
  return sanity.fetch<Prenotazione[]>(
    `*[_type == "prenotazione" && centro._ref == $centro && coalesce(stato, "confermata") == "confermata" && !defined(pagato) && inizio < $ora] | order(inizio asc){${prenotazioneFields}}`,
    { centro: centroId, ora: new Date().toISOString() },
  )
}

// Gli incassi di un periodo (per data del pagamento).
export function incassati(centroId: string, da: string, a: string) {
  return sanity.fetch<Prenotazione[]>(
    `*[_type == "prenotazione" && centro._ref == $centro && defined(pagato) && pagato.il >= $da && pagato.il < $a] | order(pagato.il desc){${prenotazioneFields}}`,
    { centro: centroId, da, a },
  )
}

// Le richieste arrivate dall'app e non ancora confermate (le prossime per prime).
export function richiesteInAttesa(centroId: string) {
  return sanity.fetch<Prenotazione[]>(
    `*[_type == "prenotazione" && centro._ref == $centro && stato == "richiesta" && fine > $ora] | order(inizio asc){${prenotazioneFields}}`,
    { centro: centroId, ora: new Date().toISOString() },
  )
}

// I gruppi di campi uguali (tipo e dentro/fuori): è quello che sceglie chi prenota dall'app.
export type Gruppo = { chiave: string; tipo: TipoCampo; coperto: boolean; prezzoOra: number; campi: number }
export const chiaveGruppo = (c: Pick<CampoCentro, 'tipo' | 'coperto'>) => `${c.tipo}-${c.coperto ? 1 : 0}`
export function gruppi(centro: Centro): Gruppo[] {
  const m = new Map<string, Gruppo>()
  for (const c of campiAttivi(centro)) {
    const k = chiaveGruppo(c)
    const g = m.get(k)
    if (g) m.set(k, { ...g, campi: g.campi + 1, prezzoOra: Math.min(g.prezzoOra, c.prezzoOra) })
    else m.set(k, { chiave: k, tipo: c.tipo, coperto: !!c.coperto, prezzoOra: c.prezzoOra, campi: 1 })
  }
  return [...m.values()].sort((a, b) => a.tipo - b.tipo || Number(a.coperto) - Number(b.coperto))
}

// Prezzo proposto: il prezzo orario del campo per la durata.
export const prezzoPer = (campo: CampoCentro | undefined, durataMin: number) => (campo ? Math.round(((campo.prezzoOra * durataMin) / 60) * 100) / 100 : 0)

// I numeri di un mese: ore prenotate e occupazione, incassi, per campo, per giorno e fascia oraria, clienti.
export function numeriMese(centro: Centro, mese: string, prenotazioni: Prenotazione[], annullate: number) {
  const [y, m] = mese.split('-').map(Number)
  const giorni = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const campi = campiAttivi(centro)
  // le ore di apertura del mese, giorno per giorno (giorni di chiusura e festività esclusi)
  const oreMese = Array.from({ length: giorni }, (_, i) => oreAperte(centro, `${mese}-${String(i + 1).padStart(2, '0')}`)).reduce((s, x) => s + x, 0)
  const disponibili = oreMese * campi.length
  const durata = (p: Prenotazione) => (Date.parse(p.fine) - Date.parse(p.inizio)) / 3_600_000
  const ore = prenotazioni.reduce((s, p) => s + durata(p), 0)
  const valore = prenotazioni.reduce((s, p) => s + (p.prezzo ?? 0), 0)
  const pagato = prenotazioni.filter((p) => p.pagato).reduce((s, p) => s + (p.prezzo ?? 0), 0)
  const perCampo = campi.map((c) => {
    const sue = prenotazioni.filter((p) => p.campo === c._key)
    const oreCampo = sue.reduce((s, p) => s + durata(p), 0)
    return { nome: c.nome, ore: oreCampo, occupazione: oreMese ? oreCampo / oreMese : 0, incasso: sue.reduce((s, p) => s + (p.prezzo ?? 0), 0) }
  })
  // giorno della settimana (lunedì = 0) e fascia oraria di inizio, in ora italiana
  const perGiorno = Array.from({ length: 7 }, () => 0)
  const perFascia = new Map<number, number>()
  const clienti = new Map<string, { n: number; spesa: number }>()
  for (const p of prenotazioni) {
    const locale = isoToRomeLocal(p.inizio)
    const g = (new Date(`${locale.slice(0, 10)}T12:00:00Z`).getUTCDay() + 6) % 7
    perGiorno[g] += durata(p)
    const ora = Number(locale.slice(11, 13))
    perFascia.set(ora, (perFascia.get(ora) ?? 0) + durata(p))
    const nome = p.cliente.trim()
    const c = clienti.get(nome.toLowerCase()) ?? { n: 0, spesa: 0 }
    clienti.set(nome.toLowerCase(), { n: c.n + 1, spesa: c.spesa + (p.prezzo ?? 0) })
  }
  const nomiClienti = new Map(prenotazioni.map((p) => [p.cliente.trim().toLowerCase(), p.cliente.trim()]))
  return {
    prenotazioni: prenotazioni.length,
    annullate,
    ore,
    occupazione: disponibili ? ore / disponibili : 0,
    valore,
    pagato,
    daPagare: valore - pagato,
    perCampo,
    perGiorno,
    perFascia: [...perFascia].sort((a, b) => a[0] - b[0]),
    clienti: [...clienti]
      .map(([k, v]) => ({ nome: nomiClienti.get(k) ?? k, ...v }))
      .sort((a, b) => b.n - a.n || b.spesa - a.spesa)
      .slice(0, 8),
  }
}
