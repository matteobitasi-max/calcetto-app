import 'server-only'
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import type { Documento } from './patch'

// Foto e immagini (profili, loghi, QR Satispay, foto a sorpresa) nell'archivio privato di Supabase (bucket "foto").
// Ogni file ha lo stesso identificativo che aveva su Sanity (image-<sha1>-<larghezza>x<altezza>-<estensione>),
// così i documenti non cambiano. Si vedono solo con un link firmato dal server, che scade (vedi `linkFoto`).

export const BUCKET = 'foto'

const storage = () => `${process.env.SUPABASE_URL}/storage/v1`
const intestazioni = () => {
  const chiave = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  return { Authorization: `Bearer ${chiave}`, apikey: chiave }
}

export const sha1 = (dati: Buffer) => createHash('sha1').update(dati).digest('hex')

export async function salvaFile(id: string, dati: Buffer, tipo: string) {
  const r = await fetch(`${storage()}/object/${BUCKET}/${id}`, {
    method: 'POST',
    headers: { ...intestazioni(), 'content-type': tipo, 'x-upsert': 'true', 'cache-control': 'max-age=31536000' },
    body: new Uint8Array(dati),
  })
  if (!r.ok) throw new Error(`Archivio foto: ${r.status} ${await r.text()}`)
}

export async function leggiFile(id: string): Promise<{ dati: Buffer; tipo: string } | null> {
  const r = await fetch(`${storage()}/object/${BUCKET}/${id}`, { headers: intestazioni(), cache: 'no-store' })
  if (r.status === 400 || r.status === 404) return null
  if (!r.ok) throw new Error(`Archivio foto: ${r.status}`)
  return { dati: Buffer.from(await r.arrayBuffer()), tipo: r.headers.get('content-type') ?? 'application/octet-stream' }
}

export async function cancellaFile(id: string) {
  await fetch(`${storage()}/object/${BUCKET}`, {
    method: 'DELETE',
    headers: { ...intestazioni(), 'content-type': 'application/json' },
    body: JSON.stringify({ prefixes: [id] }),
  })
}

// Salva una foto caricata e restituisce il documento dell'immagine, uguale a quello di Sanity.
export async function caricaFoto(dati: Buffer, opzioni: { filename?: string; contentType?: string } = {}): Promise<Documento> {
  const { default: sharp } = await import('sharp')
  const meta = await sharp(dati).metadata()
  const formato = meta.format === 'jpeg' ? 'jpg' : (meta.format ?? 'bin')
  const larghezza = meta.width ?? 0
  const altezza = meta.height ?? 0
  const hash = sha1(dati)
  const id = `image-${hash}-${larghezza}x${altezza}-${formato}`
  const tipo = opzioni.contentType ?? `image/${meta.format}`
  await salvaFile(id, dati, tipo)
  return {
    _id: id,
    _type: 'sanity.imageAsset',
    assetId: hash,
    extension: formato,
    mimeType: tipo,
    originalFilename: opzioni.filename,
    sha1hash: hash,
    size: dati.length,
    path: `${BUCKET}/${id}`,
    metadata: { dimensions: { width: larghezza, height: altezza, aspectRatio: altezza ? larghezza / altezza : 1 } },
  }
}

// ---------- Link firmati ----------

// Chiave per firmare i link, ricavata da quella segreta di Supabase (nessuna variabile in più da configurare).
const segreto = () => createHash('sha256').update(`foto|${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''}`).digest()

const firma = (ref: string, larghezza: number, ritaglio: boolean, scade: number) =>
  createHmac('sha256', segreto()).update(`${ref}|${larghezza}|${ritaglio ? 1 : 0}|${scade}`).digest('base64url').slice(0, 32)

// Larghezze arrotondate: pochi formati diversi per foto, così il browser e la CDN li riusano.
const LARGHEZZE = [64, 128, 256, 512, 1024, 1600]
export const larghezzaGiusta = (w: number) => LARGHEZZE.find((l) => l >= w) ?? LARGHEZZE[LARGHEZZE.length - 1]

const SETTIMANA = 7 * 86400

// Link alla foto, valido da 7 a 14 giorni: resta uguale per tutta la settimana (così resta in cache) e poi scade.
export function linkFoto(ref: string, larghezza: number, ritaglio: boolean) {
  const w = larghezzaGiusta(larghezza)
  const scade = (Math.floor(Date.now() / 1000 / SETTIMANA) + 2) * SETTIMANA
  return `/api/foto/${encodeURIComponent(ref)}?w=${w}&c=${ritaglio ? 1 : 0}&e=${scade}&s=${firma(ref, w, ritaglio, scade)}`
}

export function linkValido(ref: string, larghezza: number, ritaglio: boolean, scade: number, s: string) {
  if (!LARGHEZZE.includes(larghezza) || !(scade > Date.now() / 1000)) return false
  const atteso = Buffer.from(firma(ref, larghezza, ritaglio, scade))
  const dato = Buffer.from(s)
  return atteso.length === dato.length && timingSafeEqual(atteso, dato)
}
