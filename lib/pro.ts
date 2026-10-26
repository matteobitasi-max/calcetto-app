import { sanity } from './sanity'
import { isTitolare } from './player'
import { getPartitePerForma, getPlayers } from './matches'
import { analisiForma } from './forma'

// Versione Pro di una lega: forma dei giocatori e proposte di aggiornamento dei voti.
// Si attiva dallo Studio (campo "Versione Pro" della lega); finché il pagamento non c'è,
// il titolare dell'app la vede attiva in tutte le leghe per provarla.
export async function legaPro(legaId: string) {
  const pro = await sanity.fetch<boolean | null>(`*[_type == "league" && _id == $id][0].pro`, { id: legaId })
  return pro === true || (await isTitolare())
}

// Forma e proposte di una lega, ricalcolate dalle partite giocate.
export async function formaDellaLega(legaId: string) {
  const [giocatori, partite] = await Promise.all([getPlayers(legaId), getPartitePerForma(legaId)])
  // tutti per la forza nelle partite vecchie, ma le proposte solo per chi è ancora nella rosa
  const r = analisiForma(giocatori, partite)
  const attivi = new Set(giocatori.filter((g) => g.attivo !== false).map((g) => g._id))
  return { ...r, proposte: r.proposte.filter((p) => attivi.has(p.giocatoreId)) }
}
