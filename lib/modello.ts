import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'

// Link firmato per scaricare il modello Excel di una lega: si apre anche nel browser di sistema
// (dall'app su telefono), che non ha la sessione dell'app. Vale un giorno.
const firma = (legaId: string, scade: number) =>
  createHmac('sha256', `modello:${process.env.CLERK_SECRET_KEY}`).update(`${legaId}.${scade}`).digest('base64url').slice(0, 32)

export function percorsoModello(legaId: string) {
  const scade = Date.now() + 86_400_000
  return `/api/modello-giocatori?lega=${encodeURIComponent(legaId)}&scade=${scade}&firma=${firma(legaId, scade)}`
}

export function modelloValido(legaId: string, scade: number, f: string) {
  if (!legaId || !Number.isFinite(scade) || scade < Date.now()) return false
  const atteso = Buffer.from(firma(legaId, scade))
  const ricevuto = Buffer.from(f)
  return atteso.length === ricevuto.length && timingSafeEqual(atteso, ricevuto)
}
