import 'server-only'
import { sanity } from './sanity'
import { isTitolare } from './player'
import type { SanityImage } from './roster'

export type SquadraTorneo = { _key: string; nome: string; colore?: string; giocatori: { _id: string; nome: string; cognome?: string; soprannome?: string; foto?: SanityImage }[] }

export type Torneo = {
  _id: string
  legaId: string
  nome: string
  formato: 'girone' | 'eliminazione'
  calendario?: { inizio: string; ogniGiorni: number; durataMinuti: number; luogo: string }
  andataRitorno: boolean
  puntiVittoria: number
  puntiPareggio: number
  squadre: SquadraTorneo[]
  _createdAt: string
  partite: number
  giocate: number
}

const torneoFields = `_id, "legaId": lega._ref, nome, "formato": coalesce(formato, "girone"), "andataRitorno": coalesce(andataRitorno, false), calendario,
  "puntiVittoria": coalesce(puntiVittoria, 3), "puntiPareggio": coalesce(puntiPareggio, 1), _createdAt,
  "squadre": coalesce(squadre[]{_key, nome, colore, "giocatori": coalesce(giocatori[]->{_id, nome, cognome, soprannome, foto}, [])}, []),
  "partite": count(*[_type == "match" && torneo._ref == ^._id]),
  "giocate": count(*[_type == "match" && torneo._ref == ^._id && stato == "giocata"])`

export function getTornei(legaId: string) {
  return sanity.fetch<Torneo[]>(`*[_type == "tournament" && lega._ref == $legaId] | order(_createdAt desc){${torneoFields}}`, { legaId })
}

export function getTorneo(id: string) {
  return sanity.fetch<Torneo | null>(`*[_type == "tournament" && _id == $id][0]{${torneoFields}}`, { id })
}

// I tornei sono una funzione Pro. Finché il Pro non c'è, li può creare solo il titolare dell'app (per provarli).
export const puoCreareTornei = () => isTitolare()
