import 'server-only'
import { sanity } from './sanity'
import { ENTITLEMENT_CLUB, ENTITLEMENT_PRO, MAX_LEGHE_CLUB } from './entitlement'

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
  // Club scaduto o rimborsato: nelle leghe in cui l'aveva acceso questo utente passa a un altro organizzatore
  // della lega che ha il Club attivo (e un posto libero). Se non c'è nessuno la lega resta una squadra:
  // si segna quando è scaduto, e dopo la tolleranza è in sola lettura (lib/club-stato.ts).
  const leghe = await sanity.fetch<{ _id: string; clubScadeIl?: string }[]>(`*[_type == "league" && clubDi == $utente]{_id, clubScadeIl}`, { utente })
  for (const l of leghe) {
    if (club.attivo) {
      // rinnovato o riattivato: il Club torna pieno
      if (l.clubScadeIl) await sanity.patch(l._id).unset(['clubScadeIl']).commit()
      continue
    }
    const erede = await altroConClub(l._id, utente)
    if (erede) await sanity.patch(l._id).set({ clubDi: erede }).unset(['clubScadeIl']).commit()
    else if (!l.clubScadeIl) await sanity.patch(l._id).set({ clubScadeIl: club.scadenza ?? new Date().toISOString() }).commit()
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

// Un altro organizzatore della lega con il Club attivo e meno di MAX_LEGHE_CLUB leghe Club: prende il Club della lega.
async function altroConClub(legaId: string, tranne: string) {
  const candidati = await sanity.fetch<string[]>(
    `*[_type == "abbonamento" && piano == "club" && attivo != false && (!defined(scadenza) || scadenza > now())
      && clerkUserId in *[_type == "player" && lega._ref == $id && isAdmin == true && attivo != false && clerkUserId != $tranne].clerkUserId].clerkUserId`,
    { id: legaId, tranne },
  )
  for (const c of [...new Set(candidati)]) {
    const occupate = await sanity.fetch<number>(`count(*[_type == "league" && club == true && clubDi == $c && _id != $id])`, { c, id: legaId })
    if (occupate < MAX_LEGHE_CLUB) return c
  }
  return null
}

// Il mio abbonamento al Club Allenatore, se attivo.
export function mioClub(utente: string) {
  return sanity.fetch<{ scadenza?: string; store?: string; rinnovo?: boolean; dal?: string; prodotto?: string } | null>(
    `*[_type == "abbonamento" && piano == "club" && clerkUserId == $utente && attivo != false && (!defined(scadenza) || scadenza > now())] | order(scadenza desc)[0]{scadenza, store, rinnovo, dal, prodotto}`,
    { utente },
  )
}

// Il mio abbonamento (da store o creato a mano), se attivo: il Club, se ce l'ho (include il Pro), altrimenti il Pro.
export async function mioAbbonamento(utente: string) {
  const attivi = await sanity.fetch<{ scadenza?: string; store?: string; rinnovo?: boolean; dal?: string; prodotto?: string; piano?: string }[]>(
    `*[_type == "abbonamento" && clerkUserId == $utente && attivo != false && (!defined(scadenza) || scadenza > now())] | order(scadenza desc){scadenza, store, rinnovo, dal, prodotto, piano}`,
    { utente },
  )
  return attivi.find((a) => a.piano === 'club') ?? attivi[0] ?? null
}
