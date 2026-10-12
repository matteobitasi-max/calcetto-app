import 'server-only'
import { currentUser } from '@clerk/nextjs/server'
import { sanity } from './sanity'

export type Player = {
  _id: string
  nome: string
  cognome?: string
  soprannome?: string
  ruolo?: string
  piede?: string
  isAdmin?: boolean
  caratteristiche?: Record<'attacco' | 'difesa' | 'tecnica' | 'velocita' | 'resistenza' | 'porta', number>
}

const fields = `_id, nome, cognome, soprannome, ruolo, piede, isAdmin, caratteristiche`

// Restituisce il giocatore collegato all'utente loggato. Al primo login il
// collegamento avviene tramite l'email inserita dall'organizzatore nello Studio.
export async function getCurrentPlayer(): Promise<Player | null> {
  const user = await currentUser()
  if (!user) return null

  const linked = await sanity.fetch<Player | null>(
    `*[_type == "player" && clerkUserId == $id][0]{${fields}}`,
    { id: user.id },
  )
  if (linked) return linked

  const emails = user.emailAddresses
    .filter((e) => e.verification?.status === 'verified')
    .map((e) => e.emailAddress.toLowerCase())
  if (emails.length === 0) return null

  const match = await sanity.fetch<Player | null>(
    `*[_type == "player" && attivo != false && lower(email) in $emails && !defined(clerkUserId)][0]{${fields}}`,
    { emails },
  )
  if (!match) return null

  await sanity.patch(match._id).set({ clerkUserId: user.id }).commit()
  return match
}
