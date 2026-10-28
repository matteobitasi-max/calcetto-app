'use client'

import { useEffect, useRef, useState } from 'react'
import { useT } from './lingua'

export type VideoIntervista = { id: string; titolo: string; sotto?: string; verticale: boolean }

const copertina = (v: VideoIntervista) => `https://i.ytimg.com/vi/${v.id}/${v.verticale ? 'hqdefault' : 'mqdefault'}.jpg`

// Anteprime dei video da scorrere col dito; toccandone una si apre a tutto schermo dentro l'app
// e, come negli Shorts, scorrendo in su o in giù si passa agli altri video della fila.
export function StrisciaInterviste({ video }: { video: VideoIntervista[] }) {
  const [aperto, setAperto] = useState<number | null>(null)

  return (
    <>
      <div className="-mx-4 flex snap-x items-start gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {video.map((v, i) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setAperto(i)}
            className={`shrink-0 snap-start text-left ${v.verticale ? 'w-28' : 'w-52'}`}
          >
            <span className={`relative block overflow-hidden rounded-xl bg-zinc-900 shadow ${v.verticale ? 'aspect-[9/16]' : 'aspect-video'}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- copertina dal CDN di YouTube */}
              <img src={copertina(v)} alt="" loading="lazy" className="h-full w-full object-cover" />
            </span>
            <span className="mt-1 line-clamp-2 block text-sm font-medium leading-tight">{v.titolo}</span>
            {v.sotto && <span className="block truncate text-xs text-zinc-500">{v.sotto}</span>}
          </button>
        ))}
      </div>

      {aperto != null && <Lettore video={video} inizio={aperto} chiudi={() => setAperto(null)} />}
    </>
  )
}

// A tutto schermo, un video per pagina. Si carica e parte solo quello che si ha davanti.
// Sopra il video c'è un velo trasparente: lo scorrimento resta all'app (dentro il riquadro di
// YouTube il dito verrebbe "mangiato") e un tocco mette in pausa o riprende; la barra in basso
// di YouTube resta libera per andare avanti e indietro nel video.
function Lettore({ video, inizio, chiudi }: { video: VideoIntervista[]; inizio: number; chiudi: () => void }) {
  const t = useT()
  const [attivo, setAttivo] = useState(inizio)
  const [inPausa, setInPausa] = useState(false)
  const lista = useRef<HTMLDivElement>(null)
  const lettore = useRef<HTMLIFrameElement>(null)
  const chiudiRef = useRef(chiudi)
  useEffect(() => {
    chiudiRef.current = chiudi
  })

  useEffect(() => {
    const el = lista.current
    if (!el) return
    el.scrollTo({ top: inizio * el.clientHeight })
    // quale video è sullo schermo
    const osserva = new IntersectionObserver(
      (voci) => {
        for (const v of voci)
          if (v.isIntersecting) {
            setAttivo(Number((v.target as HTMLElement).dataset.indice))
            setInPausa(false)
          }
      },
      { root: el, threshold: 0.6 },
    )
    for (const pagina of el.children) osserva.observe(pagina)
    const tasti = (e: KeyboardEvent) => {
      if (e.key === 'Escape') chiudiRef.current()
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') el.scrollBy({ top: (e.key === 'ArrowDown' ? 1 : -1) * el.clientHeight, behavior: 'smooth' })
    }
    window.addEventListener('keydown', tasti)
    // sotto il lettore la pagina non scorre
    const prima = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      osserva.disconnect()
      window.removeEventListener('keydown', tasti)
      document.body.style.overflow = prima
    }
  }, [inizio])

  const tocca = () => {
    const func = inPausa ? 'playVideo' : 'pauseVideo'
    lettore.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args: [] }), 'https://www.youtube-nocookie.com')
    setInPausa(!inPausa)
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={video[attivo]?.titolo} className="fixed inset-0 z-50 bg-black">
      <div ref={lista} className="h-full snap-y snap-mandatory overflow-y-auto overscroll-contain [scrollbar-width:none]">
        {video.map((v, i) => (
          <section key={v.id} data-indice={i} className="relative flex h-full snap-start snap-always flex-col items-center justify-center">
            <div className={`relative w-full ${v.verticale ? 'aspect-[9/16] max-h-full max-w-[min(100%,56vh)]' : 'aspect-video'}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- copertina dal CDN di YouTube */}
              <img src={copertina(v)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
              {i === attivo && (
                <>
                  <iframe
                    ref={lettore}
                    src={`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&playsinline=1&rel=0&enablejsapi=1&loop=1&playlist=${v.id}`}
                    title={v.titolo}
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                    className="absolute inset-0 h-full w-full"
                  />
                  <button
                    type="button"
                    onClick={tocca}
                    aria-label={inPausa ? t('Riprendi') : t('Pausa')}
                    className="absolute inset-x-0 top-0 bottom-12 flex items-center justify-center"
                  >
                    {inPausa && <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/55 pl-1 text-3xl text-white">▶</span>}
                  </button>
                </>
              )}
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-white">
              <p className="font-semibold leading-tight">{v.titolo}</p>
              {v.sotto && <p className="text-sm text-white/70">{v.sotto}</p>}
            </div>
          </section>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        <span className="rounded-full bg-black/40 px-2 py-0.5 text-xs tabular-nums">
          {attivo + 1}/{video.length}
          {video.length > 1 && attivo === 0 && ` · ${t('scorri per il prossimo')}`}
        </span>
        <button type="button" onClick={chiudi} aria-label={t('Chiudi')} className="pointer-events-auto rounded-full bg-black/40 px-3 py-1 text-lg">
          ✕
        </button>
      </div>
    </div>
  )
}
