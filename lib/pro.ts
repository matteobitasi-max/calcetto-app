import { sanity } from './sanity'
import { getUtente, isTitolare } from './player'
import { getPartitePerForma, getPlayers } from './matches'
import { analisiForma } from './forma'

// Un abbonamento Pro vale nelle prime MAX_LEGHE_PRO leghe che si organizzano (in ordine di quando se ne è
// diventati organizzatori): basta per chiunque organizzi il suo calcetto; chi gestisce tante leghe
// (centro sportivo, scuola calcio) ci scrive per un piano apposta.
export const MAX_LEGHE_PRO = 5

// Le leghe coperte dall'abbonamento di un utente (GROQ: `^.clerkUserId` è l'utente dell'abbonamento).
const COPERTE = `*[_type == "player" && clerkUserId == ^.clerkUserId && isAdmin == true && attivo != false] | order(_createdAt asc)[0...${MAX_LEGHE_PRO}].lega._ref`
const ABBONAMENTO_ATTIVO = `_type == "abbonamento" && attivo != false && (!defined(scadenza) || scadenza > now())`

// Versione Pro di una lega: quello che vedono tutti i membri (forma dei giocatori, tornei già creati).
// È attiva se un organizzatore della lega ha l'abbonamento Pro, o se è accesa dallo Studio (campo "Versione Pro"
// della lega); il titolare dell'app la vede attiva in tutte le leghe per provarla.
export async function legaPro(legaId: string) {
  const pro = await sanity.fetch<boolean>(
    `*[_type == "league" && _id == $id][0].pro == true || count(*[${ABBONAMENTO_ATTIVO}
      && clerkUserId in *[_type == "player" && lega._ref == $id && isAdmin == true && attivo != false].clerkUserId
      && $id in ${COPERTE}]) > 0`,
    { id: legaId },
  )
  return pro || (await isTitolare())
}

// Le funzioni Pro di chi organizza (creare e gestire tornei, approvare i voti, formazioni con la forma):
// solo per chi ha il suo abbonamento. Chi viene nominato organizzatore in una lega Pro non le riceve.
// Valgono anche nelle leghe accese dallo Studio e, per provarle, per il titolare dell'app.
export async function ioPro(legaId: string) {
  const utente = await getUtente()
  if (!utente) return false
  const pro = await sanity.fetch<boolean>(
    `*[_type == "league" && _id == $id][0].pro == true
      || count(*[${ABBONAMENTO_ATTIVO} && clerkUserId == $utente && $id in ${COPERTE}]) > 0`,
    { id: legaId, utente: utente.id },
  )
  return pro || (await isTitolare())
}

// Gli organizzatori della lega con le funzioni Pro (tutti, se la lega è accesa dallo Studio).
export function organizzatoriPro(legaId: string) {
  return sanity.fetch<string[]>(
    `*[_type == "player" && lega._ref == $id && isAdmin == true && attivo != false
      && (*[_type == "league" && _id == $id][0].pro == true
        || clerkUserId in *[${ABBONAMENTO_ATTIVO} && $id in ${COPERTE}].clerkUserId)]._id`,
    { id: legaId },
  )
}

// Forma e proposte di una lega, ricalcolate dalle partite giocate.
export async function formaDellaLega(legaId: string) {
  const [giocatori, partite] = await Promise.all([getPlayers(legaId), getPartitePerForma(legaId)])
  // tutti per la forza nelle partite vecchie, ma le proposte solo per chi è ancora nella rosa
  const r = analisiForma(giocatori, partite)
  const attivi = new Set(giocatori.filter((g) => g.attivo !== false).map((g) => g._id))
  return { ...r, proposte: r.proposte.filter((p) => attivi.has(p.giocatoreId)) }
}

// Ho Pro, ma questa lega è oltre le MAX_LEGHE_PRO che copre (per il messaggio "Scrivici per il piano Club").
export async function oltreLimitePro(legaId: string) {
  const utente = await getUtente()
  if (!utente) return false
  return sanity.fetch<boolean>(
    `count(*[${ABBONAMENTO_ATTIVO} && clerkUserId == $utente]) > 0
      && count(*[_type == "player" && lega._ref == $id && clerkUserId == $utente && isAdmin == true && attivo != false]) > 0
      && count(*[${ABBONAMENTO_ATTIVO} && clerkUserId == $utente && $id in ${COPERTE}]) == 0
      && *[_type == "league" && _id == $id][0].pro != true`,
    { id: legaId, utente: utente.id },
  )
}
