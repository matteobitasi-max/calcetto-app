import { timingSafeEqual } from 'node:crypto'
import { sincronizzaAbbonamento } from '@/lib/abbonamenti'

// Webhook di RevenueCat: a ogni acquisto, rinnovo, disdetta o scadenza risincronizza l'abbonamento dell'utente.
// RevenueCat manda "Authorization: <REVENUECAT_WEBHOOK_AUTH>" (impostato nella sua dashboard).
export async function POST(request: Request) {
  const segreto = process.env.REVENUECAT_WEBHOOK_AUTH
  const ricevuto = request.headers.get('authorization') ?? ''
  if (!segreto || ricevuto.length !== segreto.length || !timingSafeEqual(Buffer.from(ricevuto), Buffer.from(segreto))) {
    return new Response('Non autorizzato', { status: 401 })
  }
  const { event } = (await request.json()) as {
    event?: { type?: string; app_user_id?: string; original_app_user_id?: string; aliases?: string[]; transferred_to?: string[]; transferred_from?: string[] }
  }
  if (!event) return new Response('ok')
  // TRANSFER: l'acquisto passa da un utente a un altro, si aggiornano tutti e due
  const utenti = new Set(
    [event.app_user_id, event.original_app_user_id, ...(event.aliases ?? []), ...(event.transferred_to ?? []), ...(event.transferred_from ?? [])].filter(
      (u): u is string => !!u && !u.startsWith('$RCAnonymousID'),
    ),
  )
  for (const u of utenti) await sincronizzaAbbonamento(u)
  return Response.json({ ok: true, utenti: utenti.size })
}
