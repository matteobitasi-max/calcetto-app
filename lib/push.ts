import 'server-only'
import { createHash } from 'node:crypto'
import webpush from 'web-push'
import { sanity } from './sanity'
import { inviaFcm } from './fcm'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT ?? 'mailto:organizzatore@example.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

export type PushSub = { endpoint: string; keys: { p256dh: string; auth: string } }
export type PushPayload = { title: string; body: string; url: string; tag?: string }

// Un documento per dispositivo: riattivare le notifiche non crea doppioni.
const subId = (endpoint: string) => `push-${createHash('sha256').update(endpoint).digest('hex').slice(0, 32)}`

// Le notifiche appartengono all'utente (il dispositivo), non a una lega:
// arrivano da tutte le leghe di cui fa parte.
export async function salvaIscrizione(clerkUserId: string, sub: PushSub, dispositivo: string) {
  await sanity.createOrReplace({
    _id: subId(sub.endpoint),
    _type: 'pushSubscription',
    tipo: 'web',
    clerkUserId,
    endpoint: sub.endpoint,
    keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    dispositivo: dispositivo.slice(0, 200),
  })
}

// App iPhone/Android: il "token" Firebase del dispositivo.
export async function salvaTokenNativo(clerkUserId: string, token: string, tipo: 'ios' | 'android', dispositivo: string) {
  await sanity.createOrReplace({
    _id: subId(`fcm:${token}`),
    _type: 'pushSubscription',
    tipo,
    clerkUserId,
    token,
    dispositivo: dispositivo.slice(0, 200),
  })
}

export async function rimuoviIscrizione(clerkUserId: string, endpoint: string) {
  const id = subId(endpoint)
  const owner = await sanity.fetch<string | null>(`*[_id == $id][0].clerkUserId`, { id })
  if (owner === clerkUserId) await sanity.delete(id)
}

type Iscrizione = { _id: string; tipo?: 'web' | 'ios' | 'android'; endpoint?: string; keys?: PushSub['keys']; token?: string }

// Invia ai dispositivi indicati: notifica web oppure, per le app native, Firebase.
// I dispositivi che non esistono più (notifiche disattivate, app disinstallata) vengono rimossi.
async function invia(subs: Iscrizione[], payload: PushPayload) {
  const esiti = await Promise.all(
    subs.map(async (s): Promise<'inviata' | 'scaduta' | 'errore'> => {
      if (s.tipo === 'ios' || s.tipo === 'android') {
        const esito = s.token ? await inviaFcm(s.token, payload).catch(() => 'errore' as const) : 'token_scaduto'
        return esito === 'token_scaduto' ? 'scaduta' : esito
      }
      try {
        await webpush.sendNotification({ endpoint: s.endpoint!, keys: s.keys! }, JSON.stringify(payload), { TTL: 60 * 60 * 24 })
        return 'inviata'
      } catch (err) {
        return [404, 410].includes((err as { statusCode?: number })?.statusCode ?? 0) ? 'scaduta' : 'errore'
      }
    }),
  )

  const scadute = subs.filter((_, i) => esiti[i] === 'scaduta')
  if (scadute.length) {
    const tx = sanity.transaction()
    for (const s of scadute) tx.delete(s._id)
    await tx.commit()
  }

  return { inviate: esiti.filter((e) => e === 'inviata').length, totali: subs.length }
}

const subFields = `{_id, tipo, endpoint, keys, token}`

// A tutti i giocatori attivi della lega.
export async function inviaATutti(legaId: string, payload: PushPayload) {
  const subs = await sanity.fetch<Iscrizione[]>(
    `*[_type == "pushSubscription"
      && coalesce(clerkUserId, giocatore->clerkUserId) in *[_type == "player" && lega._ref == $legaId && attivo != false].clerkUserId
    ]${subFields}`,
    { legaId },
  )
  return invia(subs, payload)
}

// Solo ad alcuni giocatori (per ID della loro scheda).
export async function inviaAGiocatori(playerIds: string[], payload: PushPayload) {
  if (playerIds.length === 0) return { inviate: 0, totali: 0 }
  const subs = await sanity.fetch<Iscrizione[]>(
    `*[_type == "pushSubscription"
      && coalesce(clerkUserId, giocatore->clerkUserId) in *[_type == "player" && _id in $ids].clerkUserId
    ]${subFields}`,
    { ids: playerIds },
  )
  return invia(subs, payload)
}
