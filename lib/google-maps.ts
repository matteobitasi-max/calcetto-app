import 'server-only'

// Ricerca dei campi con Google Maps (Places API "New"), sempre dal server: la chiave non arriva mai al telefono.
// Senza GOOGLE_MAPS_API_KEY la ricerca è spenta e il campo si scrive a mano come prima.
// Il "sessionToken" lega i suggerimenti e la scelta finale in un'unica sessione (Google la conta come una).
const CHIAVE = () => process.env.GOOGLE_MAPS_API_KEY
export const ricercaCampiAttiva = () => !!CHIAVE()

export type Suggerimento = { id: string; nome: string; dettaglio?: string }

type RispostaAutocomplete = {
  suggestions?: { placePrediction?: { placeId: string; text?: { text: string }; structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } } } }[]
}

export async function cercaCampi(testo: string, sessione: string, vicino?: { lat: number; lon: number }, lingua = 'it'): Promise<Suggerimento[]> {
  const chiave = CHIAVE()
  if (!chiave) return []
  const r = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': chiave },
    body: JSON.stringify({
      input: testo,
      sessionToken: sessione,
      languageCode: lingua,
      // prima i posti vicini alla città della lega (senza escludere gli altri)
      ...(vicino && { locationBias: { circle: { center: { latitude: vicino.lat, longitude: vicino.lon }, radius: 30000 } } }),
    }),
    signal: AbortSignal.timeout(5000),
  })
  if (!r.ok) throw new Error(`Google Maps ${r.status}`)
  const dati = (await r.json()) as RispostaAutocomplete
  return (dati.suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter((p): p is NonNullable<typeof p> => !!p?.placeId)
    .slice(0, 5)
    .map((p) => ({
      id: p.placeId,
      nome: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
      dettaglio: p.structuredFormat?.secondaryText?.text,
    }))
}

export type Posto = { placeId: string; nome: string; indirizzo?: string; lat: number; lon: number }

export async function dettagliCampo(placeId: string, sessione: string, lingua = 'it'): Promise<Posto | null> {
  const chiave = CHIAVE()
  if (!chiave) return null
  const q = new URLSearchParams({ languageCode: lingua, sessionToken: sessione })
  const r = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?${q}`, {
    headers: { 'X-Goog-Api-Key': chiave, 'X-Goog-FieldMask': 'id,displayName,formattedAddress,location' },
    signal: AbortSignal.timeout(5000),
  })
  if (!r.ok) return null
  const p = (await r.json()) as { id?: string; displayName?: { text?: string }; formattedAddress?: string; location?: { latitude?: number; longitude?: number } }
  if (!p.id || p.location?.latitude == null || p.location.longitude == null) return null
  return { placeId: p.id, nome: p.displayName?.text ?? '', indirizzo: p.formattedAddress, lat: p.location.latitude, lon: p.location.longitude }
}
