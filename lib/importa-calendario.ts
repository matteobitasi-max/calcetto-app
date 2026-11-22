import 'server-only'
import ICAL from 'ical.js'
import { romeLocalToISO } from './dates'

// Un evento letto da un calendario esterno (.ics, Google, Apple, Outlook, federazione…).
export type EventoEsterno = {
  /** uid dell'evento + inizio: ogni ripetizione ha la sua chiave */
  chiave: string
  inizio: string
  fine: string
  titolo: string
  luogo: string
}

const MAX_EVENTI = 150
const MESI_AVANTI = 12
const MAX_BYTE = 3 * 1024 * 1024

// Orario di un evento in ISO. Con il fuso definito nel file (o in UTC) è già giusto; senza fuso
// (o con un fuso nominato ma non definito, es. "Europe/Rome" in molti export) vale come ora italiana.
function iso(t: ICAL.Time) {
  const zona = t.zone?.tzid
  if (zona && zona !== 'floating') return t.toJSDate().toISOString()
  const p = (n: number) => String(n).padStart(2, '0')
  return romeLocalToISO(`${t.year}-${p(t.month)}-${p(t.day)}T${p(t.hour)}:${p(t.minute)}`)
}

const testo = (v: unknown) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '')

// Legge un calendario iCalendar e restituisce gli eventi futuri (ripetizioni comprese), in ordine di data.
// Gli eventi "tutto il giorno" non hanno un orario: si saltano.
export function leggiIcs(contenuto: string, ora = new Date()) {
  const fino = new Date(ora)
  fino.setMonth(fino.getMonth() + MESI_AVANTI)
  const cal = new ICAL.Component(ICAL.parse(contenuto))
  for (const vtz of cal.getAllSubcomponents('vtimezone')) ICAL.TimezoneService.register(new ICAL.Timezone(vtz))

  // le modifiche a una singola ripetizione (RECURRENCE-ID) si agganciano all'evento principale
  const eventi = cal.getAllSubcomponents('vevent').map((ve) => new ICAL.Event(ve))
  const principali = new Map(eventi.filter((e) => !e.isRecurrenceException()).map((e) => [e.uid, e]))
  for (const e of eventi) if (e.isRecurrenceException()) principali.get(e.uid)?.relateException(e)

  const fuori: EventoEsterno[] = []
  let tuttoIlGiorno = 0
  const aggiungi = (uid: string, inizio: ICAL.Time, fine: ICAL.Time, titolo: string, luogo: string, annullato: boolean) => {
    if (annullato) return
    if (inizio.isDate) return void tuttoIlGiorno++
    const da = iso(inizio)
    const d = new Date(da)
    if (d < ora || d > fino) return
    fuori.push({ chiave: `${uid}|${da}`, inizio: da, fine: iso(fine), titolo: titolo.slice(0, 120), luogo: luogo.slice(0, 120) })
  }

  for (const e of principali.values()) {
    if (fuori.length >= MAX_EVENTI) break
    const annullato = (e.component.getFirstPropertyValue('status') ?? '').toString().toUpperCase() === 'CANCELLED'
    if (!e.isRecurring()) {
      aggiungi(e.uid, e.startDate, e.endDate, testo(e.summary), testo(e.location), annullato)
      continue
    }
    const it = e.iterator()
    for (let giro = 0, prossimo = it.next(); prossimo && giro < 2000 && fuori.length < MAX_EVENTI; giro++, prossimo = it.next()) {
      if (prossimo.toJSDate() > fino && new Date(iso(prossimo)) > fino) break
      const det = e.getOccurrenceDetails(prossimo)
      const stato = (det.item.component.getFirstPropertyValue('status') ?? '').toString().toUpperCase()
      aggiungi(e.uid, det.startDate, det.endDate, testo(det.item.summary), testo(det.item.location), stato === 'CANCELLED')
    }
  }
  fuori.sort((a, b) => a.inizio.localeCompare(b.inizio))
  return { eventi: fuori.slice(0, MAX_EVENTI), tuttoIlGiorno }
}

// Solo link https verso indirizzi pubblici (niente rete interna), anche dopo i reindirizzamenti.
function linkPubblico(link: string) {
  let url: URL
  try {
    url = new URL(link.trim().replace(/^webcals?:\/\//i, 'https://'))
  } catch {
    throw new Error('link')
  }
  const host = url.hostname.toLowerCase()
  const interno =
    host === 'localhost' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.)/.test(host) ||
    host.startsWith('[') ||
    !host.includes('.')
  if (url.protocol !== 'https:' || interno) throw new Error('link')
  return url
}

// Scarica un calendario da un link pubblico (webcal:// o https://), seguendo al massimo 3 reindirizzamenti.
export async function scaricaIcs(link: string) {
  let url = linkPubblico(link)
  for (let salti = 0; salti < 4; salti++) {
    const risposta = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(10_000), headers: { Accept: 'text/calendar, */*' } })
    const verso = risposta.headers.get('location')
    if (risposta.status >= 300 && risposta.status < 400 && verso) {
      url = linkPubblico(new URL(verso, url).toString())
      continue
    }
    if (!risposta.ok) throw new Error('scarica')
    const contenuto = await risposta.text()
    if (contenuto.length > MAX_BYTE) throw new Error('grande')
    return contenuto
  }
  throw new Error('scarica')
}

export const LIMITE_BYTE = MAX_BYTE
