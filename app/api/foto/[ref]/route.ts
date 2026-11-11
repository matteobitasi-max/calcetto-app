import sharp from 'sharp'
import { leggiFile, linkValido } from '@/lib/db/foto'

// Una foto dall'archivio privato, ridimensionata. Si apre solo con il link firmato dal server
// (lib/db/foto.ts → linkFoto), che scade dopo qualche giorno: senza firma non si vede niente.
export async function GET(req: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params
  const q = new URL(req.url).searchParams
  const larghezza = Number(q.get('w'))
  const ritaglio = q.get('c') === '1'
  const scade = Number(q.get('e'))
  if (!/^image-[a-f0-9]{40}-\d+x\d+-[a-z0-9]+$/.test(ref) || !linkValido(ref, larghezza, ritaglio, scade, q.get('s') ?? '')) {
    return new Response('Link non valido o scaduto', { status: 403 })
  }
  const file = await leggiFile(ref)
  if (!file) return new Response('Foto non trovata', { status: 404 })

  // girata secondo l'EXIF, ritagliata quadrata (avatar) o solo rimpicciolita, in WebP
  const img = sharp(file.dati).rotate()
  const dati = await (ritaglio ? img.resize(larghezza, larghezza, { fit: 'cover' }) : img.resize({ width: larghezza, withoutEnlargement: true }))
    .webp({ quality: 82 })
    .toBuffer()
  const secondi = Math.max(0, Math.floor(scade - Date.now() / 1000))
  return new Response(new Uint8Array(dati), {
    headers: {
      'Content-Type': 'image/webp',
      // il link firmato è il permesso: la stessa risposta si può riusare finché il link vale
      'Cache-Control': `public, max-age=${secondi}, immutable`,
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
