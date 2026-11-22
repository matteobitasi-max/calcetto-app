import 'server-only'
import { sanity } from './sanity'
import { ENTITLEMENT_CLUB, ENTITLEMENT_PRO } from './entitlement'

// Abbonamenti Pro pagati dentro le app (App Store e Google Play), gestiti da RevenueCat.
// RevenueCat conosce l'utente con il suo id di Clerk; ogni volta che qualcosa cambia (acquisto, rinnovo,
// disdetta, scadenza) chiede al server di risincronizzare, e il server riscrive la scheda "abbonamento"
// con la data di scadenza vera. Le schede create a mano dallo Studio restano a parte.

export { ENTITLEMENT_PRO }

export const pagamentiConfigurati = () => !!process.env.REVENUECAT_SECRET_KEY

// Le chiavi pubbliche delle app (si possono dare al telefono).
export const chiaviRevenueCat = () => ({
  apple: process.env.NEXT_PUBLIC_REVENUECAT_APPLE ?? null,
  google: process.env.NEXT_PUBLIC_REVENUECAT_GOOGLE ?? null,
})

type Subscriber = {
  subscriber: {
    entitlements: Record<string, { expires_date: string | null; purchase_date: string; product_identifier: string }>
    subscriptions: Record<string, { store?: string; unsubscribe_detected_at?: string | null }>
  }
}

const idDoc = (utente: string) => `abbonamento-store-${utente.replace(/[^a-zA-Z0-9_-]/g, '')}`

// Chiede a RevenueCat lo stato degli abbonamenti dell'utente (Pro e Club) e aggiorna le sue schede.
// La scheda del Club è anch'essa un "abbonamento" (con piano "club"): così il Club dà anche tutto il Pro.
export async function sincronizzaAbbonamento(utente: string, email?: string) {
  const chiave = process.env.REVENUECAT_SECRET_KEY
  if (!chiave || !utente || utente.startsWith('$RCAnonymousID')) return null
  const r = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(utente)}`, {
    headers: { Authorization: `Bearer ${chiave}` },
    cache: 'no-store',
  })
  if (!r.ok) throw new Error(`RevenueCat ${r.status}`)
  const { subscriber } = (await r.json()) as Subscriber
  const club = await scrivi(subscriber, ENTITLEMENT_CLUB, `abbonamento-club-${idDoc(utente).replace('abbonamento-', '')}`, utente, email, 'club')
  // Club scaduto o rimborsato: si spegne nelle leghe in cui l'aveva acceso questo utente
  if (!club.attivo) {
    const leghe = await sanity.fetch<string[]>(`*[_type == "league" && clubDi == $utente]._id`, { utente })
    for (const id of leghe) await sanity.patch(id).unset(['club', 'clubDi', 'tipo']).commit()
  }
  return scrivi(subscriber, ENTITLEMENT_PRO, idDoc(utente), utente, email)
}

async function scrivi(subscriber: Subscriber['subscriber'], entitlement: string, id: string, utente: string, email?: string, piano?: 'club') {
  const ent = subscriber.entitlements?.[entitlement]
  if (!ent) {
    // mai abbonato: se c'era una scheda (es. rimborso), la si spegne
    await sanity.patch(id).set({ attivo: false }).commit().catch(() => null)
    return { attivo: false }
  }
  const attivo = !ent.expires_date || new Date(ent.expires_date) > new Date()
  const sub = subscriber.subscriptions?.[ent.product_identifier]
  await sanity.createIfNotExists({ _id: id, _type: 'abbonamento', clerkUserId: utente })
  await sanity
    .patch(id)
    .set({
      clerkUserId: utente,
      attivo,
      dal: ent.purchase_date,
      ...(ent.expires_date ? { scadenza: ent.expires_date } : {}),
      prodotto: ent.product_identifier,
      store: sub?.store ?? null,
      rinnovo: !sub?.unsubscribe_detected_at,
      ...(piano ? { piano } : {}),
      ...(email ? { email } : {}),
    })
    .commit()
  return { attivo, scadenza: ent.expires_date }
}

// Il mio abbonamento al Club Allenatore, se attivo.
export function mioClub(utente: string) {
  return sanity.fetch<{ scadenza?: string; store?: string; rinnovo?: boolean; dal?: string; prodotto?: string } | null>(
    `*[_type == "abbonamento" && piano == "club" && clerkUserId == $utente && attivo != false && (!defined(scadenza) || scadenza > now())] | order(scadenza desc)[0]{scadenza, store, rinnovo, dal, prodotto}`,
    { utente },
  )
}

// Il mio abbonamento Pro (da store o creato a mano), se attivo.
export function mioAbbonamento(utente: string) {
  return sanity.fetch<{ scadenza?: string; store?: string; rinnovo?: boolean; dal?: string; prodotto?: string } | null>(
    `*[_type == "abbonamento" && clerkUserId == $utente && attivo != false && (!defined(scadenza) || scadenza > now())] | order(scadenza desc)[0]{scadenza, store, rinnovo, dal, prodotto}`,
    { utente },
  )
}
