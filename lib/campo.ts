// Il campo scelto dalla mappa (Google Maps): il posto preciso, oltre al nome scritto in "luogo".
// Facoltativo: chi scrive il campo a mano ha solo il nome.
export type Campo = { placeId: string; indirizzo?: string; lat: number; lon: number }

const ID = /^[\w-]{10,300}$/

// Dal campo nascosto del modulo (JSON), con i controlli: niente di quello che arriva dal browser si salva così com'è.
export function leggiCampo(valore: unknown): Campo | null {
  if (typeof valore !== 'string' || !valore) return null
  try {
    const c = JSON.parse(valore) as Partial<Campo>
    const lat = Number(c.lat)
    const lon = Number(c.lon)
    if (typeof c.placeId !== 'string' || !ID.test(c.placeId)) return null
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null
    const indirizzo = typeof c.indirizzo === 'string' ? c.indirizzo.trim().slice(0, 200) : ''
    return { placeId: c.placeId, lat, lon, ...(indirizzo && { indirizzo }) }
  } catch {
    return null
  }
}

// Il link per aprire il campo in Google Maps (sul telefono apre l'app delle mappe): il posto preciso se è
// stato scelto dalla mappa, altrimenti una ricerca con il nome scritto.
export function linkMappa(luogo: string, campo?: Campo | null) {
  const q = new URLSearchParams({ api: '1', query: campo ? `${campo.lat},${campo.lon}` : luogo })
  if (campo) q.set('query_place_id', campo.placeId)
  return `https://www.google.com/maps/search/?${q}`
}
