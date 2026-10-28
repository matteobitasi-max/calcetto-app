import 'server-only'
import { sanity } from './sanity'
import { legaPro } from './pro'
import type { SanityImage } from './roster'

export type SquadraTorneo = { _key: string; nome: string; colore?: string; logo?: SanityImage; girone?: string; capitanoId?: string; codiceInvito?: string; giocatori: { _id: string; nome: string; cognome?: string; soprannome?: string; foto?: SanityImage }[] }

export type Torneo = {
  _id: string
  legaId: string
  nome: string
  formato: 'girone' | 'eliminazione' | 'gironi'
  numGironi?: number
  maxGiocatori?: number
  iscrizioniChiuse?: boolean
  codiceInvito?: string
  /** Inizio della prima partita: da lì i capitani non cambiano più le squadre. */
  primaPartita?: string
  qualificate?: number
  primoTurno?: string[]
  calendario?: { inizio: string; ogniGiorni: number; durataMinuti: number; luogo: string }
  andataRitorno: boolean
  puntiVittoria: number
  puntiPareggio: number
  squadre: SquadraTorneo[]
  _createdAt: string
  partite: number
  giocate: number
}

const torneoFields = `_id, "legaId": lega._ref, nome, "formato": coalesce(formato, "girone"), "andataRitorno": coalesce(andataRitorno, false), calendario, primoTurno, numGironi, qualificate, maxGiocatori, iscrizioniChiuse, codiceInvito,
  "primaPartita": *[_type == "match" && torneo._ref == ^._id] | order(data asc)[0].data,
  "puntiVittoria": coalesce(puntiVittoria, 3), "puntiPareggio": coalesce(puntiPareggio, 1), _createdAt,
  "squadre": coalesce(squadre[]{_key, nome, colore, logo, girone, "capitanoId": capitano._ref, codiceInvito, "giocatori": coalesce(giocatori[]->{_id, nome, cognome, soprannome, foto}, [])}, []),
  "partite": count(*[_type == "match" && torneo._ref == ^._id]),
  "giocate": count(*[_type == "match" && torneo._ref == ^._id && stato == "giocata"])`

export function getTornei(legaId: string) {
  return sanity.fetch<Torneo[]>(`*[_type == "tournament" && lega._ref == $legaId] | order(_createdAt desc){${torneoFields}}`, { legaId })
}

/** I tornei di più leghe insieme (la sezione "I miei tornei"), con nome e logo della lega. */
export function getTorneiDelleLeghe(legaIds: string[]) {
  return sanity.fetch<(Torneo & { lega: { nome: string; logo?: SanityImage } })[]>(
    `*[_type == "tournament" && lega._ref in $legaIds] | order(_createdAt desc){${torneoFields}, "lega": lega->{nome, logo}}`,
    { legaIds },
  )
}

export function getTorneo(id: string) {
  return sanity.fetch<Torneo | null>(`*[_type == "tournament" && _id == $id][0]{${torneoFields}}`, { id })
}

// I capitani possono invitare e cambiare la squadra finché l'organizzatore non chiude e non è iniziata la prima partita.
export const iscrizioniAperte = (t: Pick<Torneo, 'iscrizioniChiuse' | 'primaPartita'>, adesso = new Date()) =>
  !t.iscrizioniChiuse && (!t.primaPartita || adesso < new Date(t.primaPartita))

// I tornei sono una funzione Pro: si creano e si modificano nelle leghe con il Pro attivo
// (un organizzatore abbonato; il titolare dell'app li prova ovunque).
export const puoCreareTornei = (legaId: string) => legaPro(legaId)
