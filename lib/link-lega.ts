// Un link dell'app che porta con sé la sua lega (?apri=<lega>): aprendolo, quella diventa la lega attiva
// (vedi proxy.ts). Chi è in più leghe (es. la squadra del Club e la lega con gli amici) si ritrova nella lega
// giusta, con il suo tema e le sue funzioni. Usato dalle notifiche e dal calendario del telefono.
export function conLega(url: string, legaId: string) {
  if (!url.startsWith('/') || url.startsWith('//')) return url
  const [percorso, hash] = url.split('#')
  const sep = percorso.includes('?') ? '&' : '?'
  return `${percorso}${sep}apri=${encodeURIComponent(legaId)}${hash !== undefined ? `#${hash}` : ''}`
}
