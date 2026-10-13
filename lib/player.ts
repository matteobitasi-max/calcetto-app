import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { sanity } from './sanity'
import { canEditPlayers, canEnterResults, playerFields, type Lega, type Player } from './roster'

export * from './roster'

// La lega attiva su questo dispositivo.
export const COOKIE_LEGA = 'lega'

// La mia scheda giocatore in una lega, con i dati della lega.
export type Membro = Player & { lega: Lega }

const membroFields = `${playerFields}, "lega": lega->{_id, nome, logo, codiceInvito, satispayLink, satispayQr}`

export const getUtente = cache(async () => {
  const user = await currentUser()
  if (!user) return null
  const emails = user.emailAddresses
    .filter((e) => e.verification?.status === 'verified')
    .map((e) => e.emailAddress.toLowerCase())
  return { id: user.id, nome: user.firstName, cognome: user.lastName, emails }
})

// Tutte le leghe di cui faccio parte. Al primo accesso collega anche le schede
// che un organizzatore ha creato con la mia email (in qualsiasi lega).
export const getMemberships = cache(async (): Promise<Membro[]> => {
  const utente = await getUtente()
  if (!utente) return []

  if (utente.emails.length) {
    const daCollegare = await sanity.fetch<string[]>(
      `*[_type == "player" && attivo != false && lower(email) in $emails && !defined(clerkUserId)]._id`,
      { emails: utente.emails },
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

// La mia scheda nella lega attiva (scelta su questo dispositivo, altrimenti la prima).
export const getCurrentPlayer = cache(async (): Promise<Membro | null> => {
  const list = await getMemberships()
  if (list.length === 0) return null
  const scelta = (await cookies()).get(COOKIE_LEGA)?.value
  return list.find((m) => m.lega._id === scelta) ?? list[0]
})

export async function membroDi(legaId: string | null | undefined) {
  if (!legaId) return null
  return (await getMemberships()).find((m) => m.lega._id === legaId) ?? null
}

type Permesso = 'giocatore' | 'organizzatore' | 'valutatore' | 'refertatore'

function controlla(m: Membro, permesso: Permesso) {
  if (permesso === 'organizzatore' && !m.isAdmin) throw new Error('Solo gli organizzatori possono farlo')
  if (permesso === 'valutatore' && !canEditPlayers(m)) throw new Error('Non hai il permesso di modificare i giocatori')
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
