import 'server-only'
import { sanity } from './sanity'
import { addDays, isoToRomeLocal, romeLocalToISO } from './dates'
import { descriviRicorrenza } from './ricorrenza'

export type Series = {
  _id: string
  legaId: string
  attiva?: boolean
  primaData: string
  ora: string
  ogniSettimane: number
  fineData?: string
  durataMinuti?: number
  luogo: string
  postiDisponibili: number
  postiAutomatici?: boolean
  durataFinestraMinuti?: number
  quota?: number
  note?: string
  aperturaGiorniPrima: number
  aperturaOra: string
  chiusuraGiorniPrima: number
  chiusuraOra: string
  esclusi?: string[]
}

// Quante settimane in avanti tenere già create le partite.
const ORIZZONTE_GIORNI = 42

const seriesFields = `_id, "legaId": lega._ref, attiva, primaData, ora, ogniSettimane, fineData, durataMinuti, luogo, postiDisponibili, postiAutomatici, durataFinestraMinuti, quota, note,
  aperturaGiorniPrima, aperturaOra, chiusuraGiorniPrima, chiusuraOra, esclusi`

export function getSeries(id: string) {
  return sanity.fetch<Series | null>(`*[_type == "series" && _id == $id][0]{${seriesFields}}`, { id })
}

export function getAllSeries(legaId: string) {
  return sanity.fetch<Series[]>(
    `*[_type == "series" && lega._ref == $legaId && !(_id in path("drafts.**"))] | order(attiva desc, primaData asc){${seriesFields}}`,
    { legaId },
  )
}

// ID fisso per serie + giorno: generare due volte la stessa partita non crea doppioni.
export const occurrenceId = (seriesId: string, day: string) => `match-${seriesId}-${day}`

function occurrence(s: Series, day: string) {
  return {
    _id: occurrenceId(s._id, day),
    _type: 'match',
    lega: { _type: 'reference', _ref: s.legaId },
    serie: { _type: 'reference', _ref: s._id, _weak: true },
    data: romeLocalToISO(`${day}T${s.ora}`),
    durataMinuti: s.durataMinuti ?? 60,
    aperturaConvocazioni: romeLocalToISO(`${addDays(day, -s.aperturaGiorniPrima)}T${s.aperturaOra}`),
    chiusuraConvocazioni: romeLocalToISO(`${addDays(day, -s.chiusuraGiorniPrima)}T${s.chiusuraOra}`),
    luogo: s.luogo,
    postiDisponibili: s.postiDisponibili,
    postiAutomatici: !!s.postiAutomatici,
    durataFinestraMinuti: s.durataFinestraMinuti ?? 120,
    ...(s.quota != null && { quota: s.quota }),
    ...(s.note && { note: s.note }),
    stato: 'aperta',
    convocazioni: [],
  }
}

// I giorni della serie da oggi fino all'orizzonte, saltando quelli esclusi.
function upcomingDays(s: Series, now: Date) {
  const oggi = isoToRomeLocal(now).slice(0, 10)
  const limite = addDays(oggi, ORIZZONTE_GIORNI)
  const days: string[] = []
  for (let day = s.primaData; day <= limite && (!s.fineData || day <= s.fineData); day = addDays(day, 7 * (s.ogniSettimane || 1))) {
    if (day < oggi || s.esclusi?.includes(day)) continue
    if (new Date(romeLocalToISO(`${day}T${s.ora}`)) <= now) continue
    days.push(day)
  }
  return days
}

// Crea le partite mancanti delle serie attive. Viene chiamata quando si aprono
// le pagine con l'elenco partite, così non serve un processo programmato.
export async function assicuraRicorrenze(cosa: { legaId: string } | { serie: Series }) {
  const all = 'serie' in cosa ? [cosa.serie] : (await getAllSeries(cosa.legaId)).filter((s) => s.attiva !== false)
  const now = new Date()
  const docs = all.flatMap((s) => upcomingDays(s, now).map((day) => occurrence(s, day)))
  if (docs.length === 0) return

  const existing = new Set(await sanity.fetch<string[]>(`*[_id in $ids]._id`, { ids: docs.map((d) => d._id) }))
  const missing = docs.filter((d) => !existing.has(d._id))
  if (missing.length === 0) return

  const tx = sanity.transaction()
  for (const doc of missing) tx.createIfNotExists(doc)
  await tx.commit()
}

// Elimina le partite future della serie ancora "vuote" (aperte e senza risposte),
// così vengono rigenerate con i nuovi dati. Quelle con risposte restano com'erano.
export async function rimuoviFutureVuote(seriesId: string) {
  const ids = await sanity.fetch<string[]>(
    `*[_type == "match" && serie._ref == $id && data > now() && stato == "aperta" && count(coalesce(convocazioni, [])) == 0]._id`,
    { id: seriesId },
  )
  if (ids.length === 0) return
  const tx = sanity.transaction()
  for (const id of ids) tx.delete(id)
  await tx.commit()
}

export async function contaFutureConRisposte(seriesId: string) {
  return sanity.fetch<number>(
    `count(*[_type == "match" && serie._ref == $id && data > now() && stato in ["aperta", "chiusa"] && count(coalesce(convocazioni, [])) > 0])`,
    { id: seriesId },
  )
}

export const descriviSerie = (s: Series) => descriviRicorrenza(s)
