import { sanity } from '@/lib/sanity'
import { getUtente } from '@/lib/player'
import { orariLiberi } from '@/lib/centro-app'
import type { Centro } from '@/lib/centro'

// Gli orari liberi di un tipo di campo in un giorno (per la durata della partita).
export async function GET(request: Request) {
  if (!(await getUtente())) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  const q = new URL(request.url).searchParams
  const id = q.get('centro') ?? ''
  const gruppo = q.get('gruppo') ?? ''
  const giorno = q.get('giorno') ?? ''
  // la durata della partita arrotondata alla mezz'ora (come la prenotazione)
  const durata = Math.min(300, Math.max(30, Math.ceil((Number(q.get('durata')) || 60) / 30) * 30))
  if (!/^[\w-]{1,80}$/.test(id) || !/^\d{1,2}-[01]$/.test(gruppo) || !/^\d{4}-\d{2}-\d{2}$/.test(giorno)) return Response.json({ orari: [] })
  const centro = await sanity.fetch<Centro | null>(
    `*[_type == "centro" && _id == $id && coalesce(prenotazioniApp, "richiesta") != "spente"][0]{_id, "apre": coalesce(apre, "08:00"), "chiude": coalesce(chiude, "24:00"), "campi": coalesce(campi, []), orari, "chiusure": coalesce(chiusure, [])}`,
    { id },
  )
  if (!centro) return Response.json({ orari: [] })
  return Response.json({ orari: await orariLiberi(centro, gruppo, giorno, durata) })
}
