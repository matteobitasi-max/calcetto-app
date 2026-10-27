import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import type { Lingua } from './i18n'

// Il calendario del telefono si abbona a un link personale (feed .ics) e lo ricontrolla da solo.
// Il codice è l'id dell'utente firmato con una chiave del server: niente da salvare, e senza la
// firma giusta non si leggono le partite di qualcun altro.
const firma = (utente: string) =>
  createHmac('sha256', `calendario:${process.env.CLERK_SECRET_KEY}`).update(utente).digest('base64url').slice(0, 22)

export const codiceCalendario = (utente: string) => `${utente}.${firma(utente)}`

// L'utente del codice, se la firma torna.
export function utenteDelCodice(codice: string) {
  const [utente, f] = codice.split('.')
  if (!utente || !f) return null
  const attesa = Buffer.from(firma(utente))
  const data = Buffer.from(f)
  return attesa.length === data.length && timingSafeEqual(attesa, data) ? utente : null
}

export const percorsoCalendario = (utente: string, lingua: Lingua) => `/api/calendario/${codiceCalendario(utente)}.ics?lingua=${lingua}`
