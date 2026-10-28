import 'server-only'
import { createSign } from 'node:crypto'

// Notifiche native (app iPhone e Android) tramite Firebase Cloud Messaging, API HTTP v1.
// La chiave dell'account di servizio arriva da FIREBASE_SERVICE_ACCOUNT (JSON in base64).

type ServiceAccount = { project_id: string; client_email: string; private_key: string }

let account: ServiceAccount | null | undefined
function getAccount() {
  if (account === undefined) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT
    account = raw ? (JSON.parse(Buffer.from(raw, 'base64').toString('utf8')) as ServiceAccount) : null
  }
  return account
}

export const fcmConfigurato = () => !!getAccount()

const b64url = (input: string | Buffer) => Buffer.from(input).toString('base64url')

// Token di accesso OAuth (dura un'ora): lo teniamo finché non sta per scadere.
let accesso: { token: string; scade: number } | null = null
async function tokenDiAccesso(sa: ServiceAccount) {
  if (accesso && accesso.scade > Date.now() + 60_000) return accesso.token
  const ora = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: ora,
      exp: ora + 3600,
    }),
  )
  const firma = createSign('RSA-SHA256').update(`${header}.${claims}`).sign(sa.private_key)
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claims}.${b64url(firma)}`,
    }),
  })
  if (!res.ok) throw new Error(`Firebase: autenticazione non riuscita (${res.status}) ${(await res.text().catch(() => '')).slice(0, 200)}`)
  const json = (await res.json()) as { access_token: string; expires_in: number }
  accesso = { token: json.access_token, scade: Date.now() + json.expires_in * 1000 }
  return accesso.token
}

export type FcmPayload = { title: string; body: string; url: string; tag?: string }
export type FcmEsito = 'inviata' | 'token_scaduto' | 'errore'

export async function inviaFcm(token: string, p: FcmPayload): Promise<FcmEsito> {
  return (await inviaFcmConDettagli(token, p)).esito
}

// Come inviaFcm, con il motivo dell'errore (per la notifica di prova e per i log di Vercel).
export async function inviaFcmConDettagli(token: string, p: FcmPayload): Promise<{ esito: FcmEsito; motivo?: string }> {
  const sa = getAccount()
  if (!sa) return { esito: 'errore', motivo: 'FIREBASE_SERVICE_ACCOUNT mancante' }
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await tokenDiAccesso(sa)}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        token,
        notification: { title: p.title, body: p.body },
        data: { url: p.url },
        android: { priority: 'high', notification: { sound: 'default', ...(p.tag && { tag: p.tag }) } },
        apns: { payload: { aps: { sound: 'default', ...(p.tag && { 'thread-id': p.tag }) } } },
      },
    }),
  })
  if (res.ok) return { esito: 'inviata' }
  // App disinstallata o notifiche revocate: il token non vale più.
  const errore = (await res.json().catch(() => null)) as { error?: { status?: string; details?: { errorCode?: string }[] } } | null
  const codice = errore?.error?.details?.find((d) => d.errorCode)?.errorCode ?? errore?.error?.status
  const motivo = `${res.status} ${codice ?? ''} ${JSON.stringify(errore?.error ?? {}).slice(0, 300)}`
  console.error('FCM:', motivo)
  return { esito: res.status === 404 || codice === 'UNREGISTERED' || codice === 'NOT_FOUND' ? 'token_scaduto' : 'errore', motivo }
}
