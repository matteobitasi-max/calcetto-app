'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// "+ Nuova partita" fissa in basso a destra: si nasconde scorrendo verso il basso
// e ricompare appena si torna su. Toccandola si sceglie tra una partita e un torneo (Pro).
export function PillNuovaPartita() {
  const [visibile, setVisibile] = useState(true)
  const [scelta, setScelta] = useState(false)
  const ultimo = useRef(0)

  useEffect(() => {
    ultimo.current = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      if (Math.abs(y - ultimo.current) < 8) return // ignora i piccoli tremolii
      setVisibile(y < ultimo.current || y < 40)
      ultimo.current = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const voce = 'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800'

  return (
    <>
      <button
        type="button"
        onClick={() => setScelta(true)}
        aria-haspopup="dialog"
        aria-hidden={!visibile}
        tabIndex={visibile ? 0 : -1}
        className={`fixed right-4 z-20 inline-flex items-center gap-1.5 rounded-full bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-green-900/20 transition-all duration-300 hover:bg-green-700 bottom-[max(1.25rem,calc(var(--safe-area-inset-bottom,env(safe-area-inset-bottom))_+_0.75rem))] ${
          visibile ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-24 opacity-0'
        }`}
      >
        <span className="text-lg leading-none">+</span> Nuova partita
      </button>
      {scelta &&
        createPortal(
          <div
            role="dialog"
            aria-label="Cosa vuoi organizzare?"
            onClick={(e) => e.target === e.currentTarget && setScelta(false)}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          >
            <div className="w-full max-w-sm space-y-1 rounded-2xl bg-white p-3 shadow-2xl dark:bg-zinc-900">
              <p className="px-4 pb-1 pt-1 font-semibold">Cosa vuoi organizzare?</p>
              <Link href="/partite/nuova" className={voce} onClick={() => setScelta(false)}>
                <span className="text-2xl">⚽</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">Partita</span>
                  <span className="block text-xs text-zinc-500">Singola o ricorrente, con le convocazioni</span>
                </span>
              </Link>
              <Link href="/tornei/nuovo" className={voce} onClick={() => setScelta(false)}>
                <span className="text-2xl">🏆</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">Torneo</span>
                  <span className="block text-xs text-zinc-500">Squadre fisse, girone e classifica</span>
                </span>
                <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-zinc-900">PRO</span>
              </Link>
              <button type="button" onClick={() => setScelta(false)} className="w-full py-2 text-sm text-zinc-500">
                Annulla
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
