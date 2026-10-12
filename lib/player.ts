import 'server-only'
import { cache } from 'react'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { sanity } from './sanity'
import { SKILLS, canEditPlayers, canEnterResults, playerFields, type Player } from './roster'

export * from './roster'

// Restituisce il giocatore collegato all'utente loggato. Al primo login il
// collegamento avviene tramite l'email inserita dall'organizzatore nello Studio.
// Se la rosa è ancora vuota, il primo utente che entra diventa organizzatore.
export const getCurrentPlayer = cache(async (): Promise<Player | null> => {
  const user = await currentUser()
  if (!user) return null

  const linked = await sanity.fetch<Player | null>(
    `*[_type == "player" && clerkUserId == $id][0]{${playerFields}}`,
    { id: user.id },
  )
  if (linked) return linked

  const emails = user.emailAddresses
    .filter((e) => e.verification?.status === 'verified')
    .map((e) => e.emailAddress.toLowerCase())
  if (emails.length === 0) return null

  const match = await sanity.fetch<Player | null>(
    `*[_type == "player" && attivo != false && lower(email) in $emails && !defined(clerkUserId)][0]{${playerFields}}`,
    { emails },
  )
  if (match) {
    await sanity.patch(match._id).set({ clerkUserId: user.id }).commit()
    return match
  }

  const count = await sanity.fetch<number>(`count(*[_type == "player"])`)
  if (count > 0) return null

  // ID fisso legato all'account: se la pagina fa più richieste in parallelo
  // al primo accesso, il giocatore viene creato una volta sola.
  return sanity.createIfNotExists<Player & { clerkUserId: string }>({
    _id: `player-${user.id}`,
    _type: 'player',
    nome: user.firstName || emails[0].split('@')[0],
    ...(user.lastName && { cognome: user.lastName }),
    email: emails[0],
    clerkUserId: user.id,
    isAdmin: true,
    attivo: true,
    caratteristiche: Object.fromEntries(Object.keys(SKILLS).map((k) => [k, 5])),
  })
})

export async function requirePlayer() {
  const player = await getCurrentPlayer()
  if (!player || player.attivo === false) redirect('/')
  return player
}

export async function requireAdmin() {
  const player = await requirePlayer()
  if (!player.isAdmin) throw new Error('Solo gli organizzatori possono farlo')
  return player
}

export async function requireRefertatore() {
  const player = await requirePlayer()
  if (!canEnterResults(player)) throw new Error('Non hai il permesso di inserire i risultati')
  return player
}

export async function requireEditor() {
  const player = await requirePlayer()
  if (!canEditPlayers(player)) throw new Error('Non hai il permesso di modificare i giocatori')
  return player
}
