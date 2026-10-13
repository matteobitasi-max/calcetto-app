import { createImageUrlBuilder } from '@sanity/image-url'
import { dataset, projectId } from '@/sanity/env'
import type { SanityImage } from './roster'

const builder = createImageUrlBuilder({ projectId, dataset })

// URL di una foto quadrata ritagliata sul punto d'interesse scelto nello Studio.
export function avatarUrl(image: SanityImage | undefined, size: number) {
  if (!image?.asset) return null
  return builder.image(image).width(size).height(size).fit('crop').auto('format').url()
}

// URL dell'immagine intera (senza ritaglio), es. un QR code.
export function immagineUrl(image: SanityImage | undefined, width: number) {
  if (!image?.asset) return null
  return builder.image(image).width(width).auto('format').url()
}
