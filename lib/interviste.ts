import 'server-only'
import { cacheLife } from 'next/cache'

// Le interviste della lega arrivano da una playlist di YouTube: ogni video aggiunto alla playlist
// compare da solo nell'app (YouTube pubblica le ultime 15 di ogni playlist come feed, senza chiave).

export type Intervista = { id: string; titolo: string; pubblicata: string; verticale: boolean }

// Dal link della playlist (o di un video della playlist) al suo identificativo.
export function idPlaylist(testo: string): string | null {
  const t = testo.trim()
  if (/^(PL|UU|OL|FL)[\w-]{10,}$/.test(t)) return t
  try {
    const url = new URL(t)
    // youtube.com/playlist?list=… e watch?v=…&list=…, oppure studio.youtube.com/playlist/…/videos
    const list = url.searchParams.get('list') ?? url.pathname.match(/^\/playlist\/([\w-]+)/)?.[1]
    return list && /^[\w-]{12,}$/.test(list) ? list : null
  } catch {
    return null
  }
}

export const linkPlaylist = (id: string) => `https://www.youtube.com/playlist?list=${id}`

// Dalla più recente; null se la playlist non esiste o non è visibile (privata).
export async function intervisteDellaPlaylist(playlist: string): Promise<Intervista[] | null> {
  'use cache'
  cacheLife('hours')

  const r = await fetch(`https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(playlist)}`).catch(() => null)
  if (!r?.ok) return null
  const xml = await r.text()
  const video = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].flatMap(([, e]) => {
    const id = e.match(/<yt:videoId>([\w-]+)<\/yt:videoId>/)?.[1]
    if (!id) return []
    return [
      {
        id,
        titolo: testo(e.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ''),
        pubblicata: e.match(/<published>([^<]+)<\/published>/)?.[1] ?? '',
        // gli Shorts (girati col telefono) hanno il link /shorts/
        verticale: /href="https:\/\/www\.youtube\.com\/shorts\//.test(e),
      },
    ]
  })
  return video.sort((a, b) => b.pubblicata.localeCompare(a.pubblicata))
}

const testo = (s: string) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim()

// Chi è intervistato: il giocatore il cui soprannome, nome e cognome o cognome compare nel titolo.
export function intervistato<G extends { nome: string; cognome?: string; soprannome?: string }>(titolo: string, giocatori: G[]) {
  const t = normalizza(titolo)
  const parola = (s?: string) => !!s && s.length >= 3 && new RegExp(`(^|[^a-z0-9])${normalizza(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z0-9])`).test(t)
  return giocatori.find((g) => parola(g.soprannome) || (g.cognome && (parola(`${g.nome} ${g.cognome}`) || parola(g.cognome)))) ?? null
}

const normalizza = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
