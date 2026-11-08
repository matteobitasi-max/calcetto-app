import { sanity } from './sanity'
import { getUtente, isTitolare } from './player'
import { getPartitePerForma, getPlayers } from './matches'
import { analisiForma } from './forma'

// Versione Pro di una lega: quello che vedono tutti i membri (forma dei giocatori, tornei già creati).
// È attiva se un organizzatore della lega ha l'abbonamento Pro, o se è accesa dallo Studio (campo "Versione Pro"
// della lega); il titolare dell'app la vede attiva in tutte le leghe per provarla.
export async function legaPro(legaId: string) {
  const pro = await sanity.fetch<boolean>(
    `*[_type == "league" && _id == $id][0].pro == true || count(*[_type == "abbonamento" && attivo != false && (!defined(scadenza) || scadenza > now())
      && clerkUserId in *[_type == "player" && lega._ref == $id && isAdmin == true && attivo != false].clerkUserId]) > 0`,
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
      || count(*[_type == "abbonamento" && clerkUserId == $utente && attivo != false && (!defined(scadenza) || scadenza > now())]) > 0`,
    { id: legaId, utente: utente.id },
  )
  return pro || (await isTitolare())
}

// Gli organizzatori della lega con le funzioni Pro (tutti, se la lega è accesa dallo Studio).
export function organizzatoriPro(legaId: string) {
  return sanity.fetch<string[]>(
    `*[_type == "player" && lega._ref == $id && isAdmin == true && attivo != false
      && (*[_type == "league" && _id == $id][0].pro == true
        || clerkUserId in *[_type == "abbonamento" && attivo != false && (!defined(scadenza) || scadenza > now())].clerkUserId)]._id`,
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
