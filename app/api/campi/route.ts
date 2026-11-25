import { getCurrentPlayer } from '@/lib/player'
import { cercaCampi, dettagliCampo } from '@/lib/google-maps'
import { getLingua } from '@/lib/lingua'

// Ricerca del campo per i moduli (partita, partita ricorrente): ?q=testo per i suggerimenti, ?id=posto per
// il posto scelto. Solo per chi ha fatto l'accesso (proxy.ts) ed è in una lega.
export async function GET(request: Request) {
  const me = await getCurrentPlayer()
  if (!me) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  const url = new URL(request.url)
  const sessione = (url.searchParams.get('s') ?? '').slice(0, 64)
  if (!/^[\w-]{8,64}$/.test(sessione)) return Response.json({ error: 'Sessione mancante' }, { status: 400 })
  const lingua = await getLingua()
  try {
    const id = url.searchParams.get('id')
    if (id) {
      if (!/^[\w-]{10,300}$/.test(id)) return Response.json({ error: 'Posto non valido' }, { status: 400 })
      const posto = await dettagliCampo(id, sessione, lingua)
      return posto ? Response.json({ posto }) : Response.json({ error: 'Posto non trovato' }, { status: 404 })
    }
    const q = (url.searchParams.get('q') ?? '').trim().slice(0, 100)
    if (q.length < 3) return Response.json({ suggerimenti: [] })
    return Response.json({ suggerimenti: await cercaCampi(q, sessione, me.lega.citta, lingua) })
  } catch {
    return Response.json({ error: 'Ricerca non disponibile' }, { status: 502 })
  }
}
