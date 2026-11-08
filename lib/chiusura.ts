import 'server-only'
import { sanity } from './sanity'
import { assegnaPosti, getMatch, presenti, type Match, type Risposta } from './matches'
import { formatoDaIscritti } from './limiti'
import { inviaAGiocatori } from './push'
import type { T } from './i18n'

// Quanto dopo l'orario di chiusura le convocazioni si chiudono ancora da sole (con l'avviso a chi è in lista):
// le partite rimaste aperte da tempo non mandano notifiche vecchie.
const ENTRO = 24 * 3_600_000

// "7 convocati su 10" (o solo "7 convocati" quando il numero lo decidono le convocazioni).
export const convocati = (match: Match, t: T) => {
  const n = presenti(match).length
  return match.postiAutomatici ? t('{n} convocati', { n }) : t('{n} convocati su {posti}', { n, posti: match.postiDisponibili })
}

type Doc = {
  _rev: string
  stato?: string
  postiAutomatici?: boolean
  postiDisponibili?: number
  convocazioni?: { _key: string; risposta: Risposta; rispostoIl?: string; aggiunto?: boolean }[]
}

// Chiude le convocazioni (a mano dall'organizzatore, o da sole a tempo scaduto) e avvisa chi è in lista.
// "In base alle convocazioni": si gioca in numero pari (l'ultimo arrivato, se dispari, va in lista d'attesa).
// Se la partita è già chiusa non fa niente: chi chiude per primo manda l'avviso, una volta sola.
export async function chiudiConvocazioni(matchId: string) {
  for (let tentativo = 0; tentativo < 3; tentativo++) {
    const doc = await sanity.fetch<Doc | null>(`*[_type == "match" && _id == $id][0]{_rev, stato, postiAutomatici, postiDisponibili, convocazioni}`, {
      id: matchId,
    })
    if (!doc || (doc.stato ?? 'aperta') !== 'aperta') return false
    const patch = sanity.patch(matchId).ifRevisionId(doc._rev).set({ stato: 'chiusa' })
    if (doc.postiAutomatici && doc.convocazioni) {
      const iscritti = doc.convocazioni.filter((c) => c.risposta !== 'assente').length
      if (iscritti >= 2) {
        const posti = formatoDaIscritti(iscritti, doc.postiDisponibili).giocano
        patch.set({ postiDisponibili: posti, convocazioni: assegnaPosti(doc.convocazioni, posti) })
      }
    }
    try {
      await patch.commit()
    } catch (err) {
      // qualcuno ha risposto (o chiuso) nel frattempo: si riguarda la partita aggiornata
      if (tentativo === 2) throw err
      continue
    }
    const match = await getMatch(matchId)
    if (match) {
      await inviaAGiocatori(
        presenti(match).map((c) => c.giocatore._id),
        (t) => ({
          title: `🔒 ${t('Convocazioni chiuse')} – ${t('Ricordate le pettorine')}`,
          body: `${t.data(match.data, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · ${match.luogo}\n${convocati(match, t)}`,
          url: `/partite/${matchId}`,
          tag: matchId,
        }),
        'convocazioni',
      ).catch(() => undefined)
    }
    return true
  }
  return false
}

// Le convocazioni scadute da poco si chiudono da sole: si possono fare subito le formazioni.
// La chiamano il controllo ogni 5 minuti e le pagine della partita (così non si aspetta il controllo).
export function scadutaDaChiudere(m: Pick<Match, 'stato' | 'chiusuraConvocazioni'>, ora = Date.now()) {
  const chiusura = m.chiusuraConvocazioni ? new Date(m.chiusuraConvocazioni).getTime() : NaN
  return m.stato === 'aperta' && chiusura <= ora && ora - chiusura < ENTRO
}

export const ENTRO_CHIUSURA_MS = ENTRO

// La partita da mostrare: se le convocazioni sono appena scadute, prima si chiudono.
export async function conConvocazioniAggiornate(match: Match) {
  if (!scadutaDaChiudere(match)) return match
  await chiudiConvocazioni(match._id).catch(() => false)
  return (await getMatch(match._id)) ?? match
}
