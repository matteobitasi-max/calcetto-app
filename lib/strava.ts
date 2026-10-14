import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { sanity } from './sanity'

// Collegamento a Strava per prendere i km della partita.
// L'app va registrata su strava.com/settings/api (STRAVA_CLIENT_ID e STRAVA_CLIENT_SECRET).
// Il token di ogni utente sta nel documento "strava-<clerkUserId>" (dataset privato).

const API = 'https://www.strava.com'

export const stravaConfigurato = () => !!process.env.STRAVA_CLIENT_ID && !!process.env.STRAVA_CLIENT_SECRET

type Collegamento = { _id: string; accessToken: string; refreshToken: string; scadeIl: number; atleta?: string }
const docId = (clerkUserId: string) => `strava-${clerkUserId}`

// Lo "state" di OAuth: chi si sta collegando, se dall'app e dove tornare, firmato con il segreto Strava.
type Stato = { u: string; app: boolean; torna: string; scade: number }
const firma = (dati: string) => createHmac('sha256', process.env.STRAVA_CLIENT_SECRET!).update(dati).digest('base64url')

export function urlCollegamento(clerkUserId: string, app: boolean, torna: string, base: string) {
  const dati = Buffer.from(JSON.stringify({ u: clerkUserId, app, torna, scade: Date.now() + 15 * 60_000 } satisfies Stato)).toString('base64url')
  const q = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    redirect_uri: `${base}/api/strava/callback`,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'activity:read_all',
    state: `${dati}.${firma(dati)}`,
  })
  return `${API}/oauth/authorize?${q}`
}

export function leggiStato(state: string | null): Stato | null {
  const [dati, f] = (state ?? '').split('.')
  if (!dati || !f) return null
  const atteso = Buffer.from(firma(dati))
  const ricevuto = Buffer.from(f)
  if (atteso.length !== ricevuto.length || !timingSafeEqual(atteso, ricevuto)) return null
  const stato = JSON.parse(Buffer.from(dati, 'base64url').toString()) as Stato
  return stato.scade > Date.now() ? stato : null
}

async function token(body: Record<string, string>) {
  const r = await fetch(`${API}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.STRAVA_CLIENT_ID, client_secret: process.env.STRAVA_CLIENT_SECRET, ...body }),
  })
  if (!r.ok) throw new Error(`Strava: ${r.status}`)
  return (await r.json()) as { access_token: string; refresh_token: string; expires_at: number; athlete?: { firstname?: string; lastname?: string } }
}

// Fine del collegamento (callback di OAuth): salva i token dell'utente.
export async function salvaCollegamento(clerkUserId: string, code: string) {
  const t = await token({ code, grant_type: 'authorization_code' })
  await sanity.createOrReplace({
    _id: docId(clerkUserId),
    _type: 'stravaCollegamento',
    clerkUserId,
    accessToken: t.access_token,
    refreshToken: t.refresh_token,
    scadeIl: t.expires_at,
    atleta: [t.athlete?.firstname, t.athlete?.lastname].filter(Boolean).join(' ') || undefined,
  })
}

export async function getCollegamento(clerkUserId: string) {
  return sanity.fetch<Collegamento | null>(`*[_id == $id][0]{_id, accessToken, refreshToken, scadeIl, atleta}`, { id: docId(clerkUserId) })
}

async function accessToken(c: Collegamento) {
  if (c.scadeIl > Date.now() / 1000 + 60) return c.accessToken
  const t = await token({ refresh_token: c.refreshToken, grant_type: 'refresh_token' })
  await sanity.patch(c._id).set({ accessToken: t.access_token, refreshToken: t.refresh_token, scadeIl: t.expires_at }).commit()
  return t.access_token
}

// L'attività Strava che si sovrappone di più all'orario della partita (almeno 10 minuti).
export async function kmStrava(clerkUserId: string, inizio: Date, fine: Date) {
  const c = await getCollegamento(clerkUserId)
  if (!c) return { collegato: false as const }
  const q = new URLSearchParams({
    after: String(Math.floor(inizio.getTime() / 1000) - 3 * 3600),
    before: String(Math.floor(fine.getTime() / 1000) + 3600),
    per_page: '30',
  })
  const r = await fetch(`${API}/api/v3/athlete/activities?${q}`, { headers: { Authorization: `Bearer ${await accessToken(c)}` } })
  if (!r.ok) throw new Error(`Strava: ${r.status}`)
  const attivita = (await r.json()) as { name: string; distance: number; start_date: string; elapsed_time: number }[]
  let migliore: { km: number; nome: string; sovrapposti: number } | null = null
  for (const a of attivita) {
    const da = new Date(a.start_date).getTime()
    const a2 = da + a.elapsed_time * 1000
    const sovrapposti = Math.min(a2, fine.getTime()) - Math.max(da, inizio.getTime())
    if (sovrapposti >= 10 * 60_000 && a.distance > 0 && (!migliore || sovrapposti > migliore.sovrapposti)) {
      migliore = { km: a.distance / 1000, nome: a.name, sovrapposti }
    }
  }
  return { collegato: true as const, attivita: migliore && { km: migliore.km, nome: migliore.nome } }
}

export async function scollega(clerkUserId: string) {
  const c = await getCollegamento(clerkUserId)
  if (!c) return
  await fetch(`${API}/oauth/deauthorize`, { method: 'POST', headers: { Authorization: `Bearer ${await accessToken(c).catch(() => c.accessToken)}` } }).catch(
    () => undefined,
  )
  await sanity.delete(c._id)
}
