import 'server-only'
import { headers } from 'next/headers'

export const SITO = 'https://www.thecapfc.app'

// Indirizzo pubblico dell'app, ricavato dalla richiesta (funziona in locale e online).
export async function baseUrl() {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  // le app installate prima della 1.3 aprono ancora il vecchio indirizzo: i link da condividere usano quello nuovo
  if (host.endsWith('.vercel.app')) return SITO
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}
