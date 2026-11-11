import { createImageUrlBuilder } from '@sanity/image-url'
import { dataset, projectId } from '@/sanity/env'
import { linkFoto } from './db/foto'
import { usaSupabase } from './db/scelta'
import type { SanityImage } from './roster'

const builder = createImageUrlBuilder({ projectId, dataset })

// URL di una foto quadrata ritagliata (su Sanity: sul punto d'interesse scelto nello Studio).
export function avatarUrl(image: SanityImage | undefined, size: number) {
  if (!image?.asset) return null
  if (usaSupabase()) return linkFoto(image.asset._ref, size, true)
  return builder.image(image).width(size).height(size).fit('crop').auto('format').url()
}

// URL dell'immagine intera (senza ritaglio), es. un QR code.
export function immagineUrl(image: SanityImage | undefined, width: number) {
  if (!image?.asset) return null
  if (usaSupabase()) return linkFoto(image.asset._ref, width, false)
  return builder.image(image).width(width).auto('format').url()
}
