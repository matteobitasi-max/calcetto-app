import 'server-only'
import { sanity } from './sanity'

// Abbonamenti Pro pagati dentro le app (App Store e Google Play), gestiti da RevenueCat.
// RevenueCat conosce l'utente con il suo id di Clerk; ogni volta che qualcosa cambia (acquisto, rinnovo,
// disdetta, scadenza) chiede al server di risincronizzare, e il server riscrive la scheda "abbonamento"
// con la data di scadenza vera. Le schede create a mano dallo Studio restano a parte.

export const ENTITLEMENT_PRO = 'pro'

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

// Chiede a RevenueCat lo stato dell'abbonamento dell'utente e aggiorna la sua scheda.
export async function sincronizzaAbbonamento(utente: string, email?: string) {
  const chiave = process.env.REVENUECAT_SECRET_KEY
  if (!chiave || !utente || utente.startsWith('$RCAnonymousID')) return null
  const r = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(utente)}`, {
    headers: { Authorization: `Bearer ${chiave}` },
    cache: 'no-store',
  })
  if (!r.ok) throw new Error(`RevenueCat ${r.status}`)
  const { subscriber } = (await r.json()) as Subscriber
  const pro = subscriber.entitlements?.[ENTITLEMENT_PRO]
  const id = idDoc(utente)
  if (!pro) {
    // mai abbonato: se c'era una scheda (es. rimborso), la si spegne
    await sanity.patch(id).set({ attivo: false }).commit().catch(() => null)
    return { attivo: false }
  }
  const attivo = !pro.expires_date || new Date(pro.expires_date) > new Date()
  const sub = subscriber.subscriptions?.[pro.product_identifier]
  await sanity.createIfNotExists({ _id: id, _type: 'abbonamento', clerkUserId: utente })
  await sanity
    .patch(id)
    .set({
      clerkUserId: utente,
      attivo,
      dal: pro.purchase_date,
      ...(pro.expires_date ? { scadenza: pro.expires_date } : {}),
      prodotto: pro.product_identifier,
      store: sub?.store ?? null,
      rinnovo: !sub?.unsubscribe_detected_at,
      ...(email ? { email } : {}),
    })
    .commit()
  return { attivo, scadenza: pro.expires_date }
}

// Il mio abbonamento Pro (da store o creato a mano), se attivo.
export function mioAbbonamento(utente: string) {
  return sanity.fetch<{ scadenza?: string; store?: string; rinnovo?: boolean } | null>(
    `*[_type == "abbonamento" && clerkUserId == $utente && attivo != false && (!defined(scadenza) || scadenza > now())] | order(scadenza desc)[0]{scadenza, store, rinnovo}`,
    { utente },
  )
}
