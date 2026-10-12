import 'server-only'
import { createHash } from 'node:crypto'
import webpush from 'web-push'
import { sanity } from './sanity'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT ?? 'mailto:organizzatore@example.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

export type PushSub = { endpoint: string; keys: { p256dh: string; auth: string } }
export type PushPayload = { title: string; body: string; url: string; tag?: string }

// Un documento per dispositivo: riattivare le notifiche non crea doppioni.
const subId = (endpoint: string) => `push-${createHash('sha256').update(endpoint).digest('hex').slice(0, 32)}`

export async function salvaIscrizione(playerId: string, sub: PushSub, dispositivo: string) {
  await sanity.createOrReplace({
    _id: subId(sub.endpoint),
    _type: 'pushSubscription',
    tipo: 'web',
    giocatore: { _type: 'reference', _ref: playerId, _weak: true },
    endpoint: sub.endpoint,
    keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    dispositivo: dispositivo.slice(0, 200),
  })
}

export async function rimuoviIscrizione(playerId: string, endpoint: string) {
  const id = subId(endpoint)
  const owner = await sanity.fetch<string | null>(`*[_id == $id][0].giocatore._ref`, { id })
  if (owner === playerId) await sanity.delete(id)
}

// Invia a tutti i dispositivi dei giocatori attivi. I dispositivi che non
// esistono più (notifiche disattivate, app disinstallata) vengono rimossi.
// Per ora solo notifiche web: le app native (APNs/FCM) si aggiungeranno qui.
export async function inviaATutti(payload: PushPayload) {
  const subs = await sanity.fetch<(PushSub & { _id: string })[]>(
    `*[_type == "pushSubscription" && coalesce(tipo, "web") == "web" && giocatore->attivo != false]{_id, endpoint, keys}`,
  )
  const results = await Promise.allSettled(
    subs.map((s) => webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify(payload), { TTL: 60 * 60 * 24 })),
  )

  const scadute = subs.filter((_, i) => {
    const r = results[i]
    return r.status === 'rejected' && [404, 410].includes((r.reason as { statusCode?: number })?.statusCode ?? 0)
  })
  if (scadute.length) {
    const tx = sanity.transaction()
    for (const s of scadute) tx.delete(s._id)
    await tx.commit()
  }

  return { inviate: results.filter((r) => r.status === 'fulfilled').length, totali: subs.length }
}
