import { getUtente } from '@/lib/player'
import { centroDaPosto, pubblico } from '@/lib/centro-app'

// Il posto scelto sulla mappa è un centro sportivo su The Cap? Se sì: nome, tipi di campo e come prenota.
export async function GET(request: Request) {
  if (!(await getUtente())) return Response.json({ error: 'Non autorizzato' }, { status: 401 })
  const posto = new URL(request.url).searchParams.get('posto') ?? ''
  const centro = await centroDaPosto(posto)
  return Response.json({ centro: centro && centro.prenotazioniApp !== 'spente' ? pubblico(centro) : null })
}
