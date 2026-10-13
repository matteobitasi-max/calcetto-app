// Le date sono salvate in UTC; vengono mostrate e inserite sempre in ora italiana,
// indipendentemente dal fuso orario del server.
const TZ = 'Europe/Rome'

export function formatData(iso: string, opts: Intl.DateTimeFormatOptions = { dateStyle: 'full', timeStyle: 'short' }) {
  return new Intl.DateTimeFormat('it-IT', { ...opts, timeZone: TZ }).format(new Date(iso))
}

const romeFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

function romeParts(date: Date) {
  return Object.fromEntries(romeFormat.formatToParts(date).map((p) => [p.type, p.value]))
}

// ISO UTC -> "2026-10-15T20:30" (ora di Roma), per i campi datetime-local
export function isoToRomeLocal(iso: string | Date) {
  const p = romeParts(new Date(iso))
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`
}

// "2026-10-15" + n giorni (date di calendario, senza fusi orari)
export function addDays(day: string, n: number) {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

// "2026-10-15T20:30" + n minuti (orari di calendario, senza fusi orari)
export function addMinuti(local: string, n: number) {
  const [d, t] = local.split('T')
  const [y, m, g] = d.split('-').map(Number)
  const [h, min] = t.split(':').map(Number)
  return new Date(Date.UTC(y, m - 1, g, h, min + n)).toISOString().slice(0, 16)
}

// Minuti tra due orari "AAAA-MM-GGTHH:MM"
export const minutiTra = (da: string, a: string) => Math.round((Date.parse(`${a}:00Z`) - Date.parse(`${da}:00Z`)) / 60_000)

// "2026-10-15T20:30" (ora di Roma) -> ISO UTC
export function romeLocalToISO(local: string) {
  const asUtc = new Date(`${local}:00Z`)
  const p = romeParts(asUtc)
  const romeAsUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute)
  return new Date(asUtc.getTime() - (romeAsUtc - asUtc.getTime())).toISOString()
}

// Adesso, in ora di Roma, arrotondato ai 5 minuti successivi ("2026-10-15T20:35").
export const adessoArrotondato = () => isoToRomeLocal(new Date(Math.ceil(Date.now() / 300_000) * 300_000))
