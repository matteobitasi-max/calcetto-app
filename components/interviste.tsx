'use client'

import { useState } from 'react'
import { useT } from './lingua'

export type VideoIntervista = { id: string; titolo: string; sotto?: string; verticale: boolean }

// Anteprime dei video da scorrere col dito; toccandone una il video si apre a tutto schermo
// dentro l'app (lettore di YouTube senza cookie di profilazione).
export function StrisciaInterviste({ video }: { video: VideoIntervista[] }) {
  const t = useT()
  const [aperto, setAperto] = useState<VideoIntervista | null>(null)

  return (
    <>
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {video.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setAperto(v)}
            className={`shrink-0 snap-start text-left ${v.verticale ? 'w-28' : 'w-52'}`}
          >
            <span className={`relative block overflow-hidden rounded-xl bg-zinc-900 shadow ${v.verticale ? 'aspect-[9/16]' : 'aspect-video'}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- copertina dal CDN di YouTube */}
              <img src={`https://i.ytimg.com/vi/${v.id}/${v.verticale ? 'hqdefault' : 'mqdefault'}.jpg`} alt="" loading="lazy" className="h-full w-full object-cover" />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/55 pl-1 text-xl text-white">▶</span>
              </span>
            </span>
            <span className="mt-1 line-clamp-2 block text-sm font-medium leading-tight">{v.titolo}</span>
            {v.sotto && <span className="block truncate text-xs text-zinc-500">{v.sotto}</span>}
          </button>
        ))}
      </div>

      {aperto && (
        <div role="dialog" aria-modal="true" aria-label={aperto.titolo} className="fixed inset-0 z-50 flex flex-col bg-black pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center gap-3 p-3 text-white">
            <p className="min-w-0 flex-1 truncate text-sm font-medium">{aperto.titolo}</p>
            <button type="button" onClick={() => setAperto(null)} aria-label={t('Chiudi')} className="rounded-full bg-white/15 px-3 py-1 text-lg">
              ✕
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${aperto.id}?autoplay=1&playsinline=1&rel=0`}
              title={aperto.titolo}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              className={aperto.verticale ? 'aspect-[9/16] max-h-full w-full max-w-[min(100%,56vh)]' : 'aspect-video w-full'}
            />
          </div>
        </div>
      )}
    </>
  )
}
