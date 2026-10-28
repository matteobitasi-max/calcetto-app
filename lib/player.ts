import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { sanity } from './sanity'
import { canEnterResults, playerFields, type Lega, type Player } from './roster'
import { CONTATTO_EMAIL } from './contatti'

export * from './roster'

// La lega attiva su questo dispositivo.
export const COOKIE_LEGA = 'lega'

// La mia scheda giocatore in una lega, con i dati della lega.
// `ospite`: il titolare dell'app in una lega di cui non fa parte (super admin): ha i poteri
// dell'organizzatore ma non è un giocatore (niente scheda, convocazioni, pagamenti).
export type Membro = Player & { lega: Lega; ospite?: boolean }

const legaFields = `_id, nome, logo, codiceInvito, satispayLink, satispayQr, citta, playlistInterviste,
  "fotoSorprese": coalesce(fotoSorprese, []) + select(defined(fotoSorpresa) => [fotoSorpresa{..., "_key": "vecchia"}], [])`
const membroFields = `${playerFields}, "lega": lega->{${legaFields}}`

export const getUtente = cache(async () => {
  const user = await currentUser()
  if (!user) return null
  const emails = user.emailAddresses
    .filter((e) => e.verification?.status === 'verified')
    .map((e) => e.emailAddress.toLowerCase())
  const telefoni = user.phoneNumbers.filter((p) => p.verification?.status === 'verified').map((p) => p.phoneNumber)
  // Dati del profilo scelti nella pagina "Il mio account" (finiscono anche nelle schede giocatore).
  const profilo = (user.privateMetadata ?? {}) as {
    telefono?: string
    ruolo?: string
    piede?: string
    dataNascita?: string
    /** foto profilo (immagine su Sanity): va anche nelle schede delle leghe in cui entro dopo */
    fotoAsset?: string
    profiloCompleto?: boolean
  }
  return {
    id: user.id,
    nome: user.firstName,
    cognome: user.lastName,
    emails,
    telefoni,
    foto: user.hasImage ? user.imageUrl : null,
    telefono: profilo.telefono,
    ruolo: profilo.ruolo,
    piede: profilo.piede,
    dataNascita: profilo.dataNascita,
    fotoAsset: profilo.fotoAsset,
    // "Completa il tuo profilo" al primo accesso: per chi si registra da oggi e per chi non ha ancora nome e cognome.
    daCompletare: !profilo.profiloCompleto && (user.createdAt > Date.parse('2026-10-28T00:00:00Z') || !user.firstName?.trim() || !user.lastName?.trim()),
  }
})

// Il titolare dell'app (accesso con la sua email verificata): solo lui imposta la foto sorpresa.
export const isTitolare = async () => !!(await getUtente())?.emails.includes(CONTATTO_EMAIL)

// Tutte le leghe di cui faccio parte. Al primo accesso collega anche le schede
// che un organizzatore ha creato con la mia email o il mio telefono (in qualsiasi lega).
export const getMemberships = cache(async (): Promise<Membro[]> => {
  const utente = await getUtente()
  if (!utente) return []

  if (utente.emails.length || utente.telefoni.length) {
    // Schede create da un organizzatore con la mia email o il mio numero di telefono.
    const daCollegare = await sanity.fetch<string[]>(
      `*[_type == "player" && attivo != false && !defined(clerkUserId) && (lower(email) in $emails || telefono in $telefoni)]._id`,
      { emails: utente.emails, telefoni: utente.telefoni },
    )
    if (daCollegare.length) {
      const tx = sanity.transaction()
      for (const id of daCollegare) tx.patch(id, (p) => p.set({ clerkUserId: utente.id }))
      await tx.commit()
    }
  }

  const list = await sanity.fetch<Membro[]>(
    `*[_type == "player" && clerkUserId == $id && attivo != false && defined(lega->_id)] | order(lega->nome asc){${membroFields}}`,
    { id: utente.id },
  )
  // Una sola scheda per lega, anche se per errore ce ne fossero due.
  const viste = new Set<string>()
  return list.filter((m) => !viste.has(m.lega._id) && viste.add(m.lega._id))
})

// Super admin: il titolare dell'app entra in una lega di cui non fa parte come "ospite".
const getOspite = cache(async (legaId: string): Promise<Membro | null> => {
  if (!(await isTitolare())) return null
  const lega = await sanity.fetch<Lega | null>(`*[_type == "league" && _id == $legaId][0]{${legaFields}}`, { legaId })
  if (!lega) return null
  return { _id: `ospite-${lega._id}`, nome: 'Super admin', isAdmin: true, puoInserireRisultati: true, ospite: true, lega }
})

// Tutte le leghe dell'app, per il super admin.
export async function getTutteLeLeghe() {
  if (!(await isTitolare())) return []
  return sanity.fetch<{ _id: string; nome: string; logo?: Lega['logo']; giocatori: number; partite: number }[]>(
    `*[_type == "league"] | order(lower(nome) asc){_id, nome, logo,
      "giocatori": count(*[_type == "player" && lega._ref == ^._id && attivo != false]),
      "partite": count(*[_type == "match" && lega._ref == ^._id])}`,
  )
}

// La mia scheda nella lega attiva (scelta su questo dispositivo, altrimenti la prima).
// Il titolare può avere come lega attiva anche una lega di cui non fa parte (ospite).
export const getCurrentPlayer = cache(async (): Promise<Membro | null> => {
  const list = await getMemberships()
  const scelta = (await cookies()).get(COOKIE_LEGA)?.value
  const mia = list.find((m) => m.lega._id === scelta)
  if (mia) return mia
  if (scelta) {
    const ospite = await getOspite(scelta)
    if (ospite) return ospite
  }
  return list[0] ?? null
})

// La mia scheda in una lega (per il titolare, se non ne fa parte, l'accesso da ospite).
export async function membroDi(legaId: string | null | undefined) {
  if (!legaId) return null
  return (await getMemberships()).find((m) => m.lega._id === legaId) ?? (await getOspite(legaId))
}

// Per le azioni da giocatore (rispondere, pagare, preferenze): l'ospite non è un giocatore.
export function soloGiocatore<M extends Membro>(m: M) {
  if (m.ospite) throw new Error('Come super admin non sei un giocatore di questa lega')
  return m
}

type Permesso = 'giocatore' | 'organizzatore' | 'refertatore'

function controlla(m: Membro, permesso: Permesso) {
  if (permesso === 'organizzatore' && !m.isAdmin) throw new Error('Solo gli organizzatori possono farlo')
  if (permesso === 'refertatore' && !canEnterResults(m)) throw new Error('Non hai il permesso di inserire i risultati')
  return m
}

// Permesso nella lega attiva (pagine dell'elenco, creazione di partite e giocatori).
export async function requirePlayer() {
  const m = await getCurrentPlayer()
  if (!m) redirect('/benvenuto')
  return m
}
export const requireAdmin = async () => controlla(await requirePlayer(), 'organizzatore')

// Permesso nella lega a cui appartiene un documento (partita, giocatore, serie):
// così non si può agire su dati di leghe di cui non si fa parte.
export async function requireIn(legaId: string | null | undefined, permesso: Permesso = 'giocatore') {
  const m = await membroDi(legaId)
  if (!m) throw new Error('Non fai parte di questa lega')
  return controlla(m, permesso)
}

export async function requireForDoc(docId: string, permesso: Permesso = 'giocatore') {
  const legaId = await sanity.fetch<string | null>(`*[_id == $id][0].lega._ref`, { id: docId })
  return requireIn(legaId, permesso)
}
