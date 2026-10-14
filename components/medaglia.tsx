'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

// Badge o trofeo toccabile: si apre una finestrella che spiega cos'è (e quando è stato sbloccato).
export function Medaglia({
  children,
  emoji,
  titolo,
  testo,
  dettaglio,
  className = '',
}: {
  children: ReactNode
  emoji: ReactNode
  titolo: string
  testo: string
  dettaglio?: string
  className?: string
}) {
  const [aperta, setAperta] = useState(false)

  useEffect(() => {
    if (!aperta) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAperta(false)
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [aperta])

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          // dentro un link (es. il nome in un elenco) spiega il badge, non apre la pagina
          e.preventDefault()
          e.stopPropagation()
          setAperta(true)
        }}
        title={titolo}
        className={className}
      >
        {children}
      </button>
      {aperta &&
        createPortal(
          <div
            role="dialog"
            aria-label={titolo}
            onClick={() => setAperta(false)}
            className="fixed inset-0 z-[60] flex animate-[zoom_150ms_ease-out] items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
          >
            <div className="w-full max-w-xs space-y-2 rounded-2xl bg-white p-6 text-center shadow-2xl dark:bg-zinc-900">
              <div className="text-5xl">{emoji}</div>
              <h2 className="text-lg font-bold">{titolo}</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">{testo}</p>
              {dettaglio && <p className="text-sm font-medium text-green-700 dark:text-green-400">{dettaglio}</p>}
              <button type="button" onClick={() => setAperta(false)} className="mt-2 text-sm text-zinc-500 underline">
                Chiudi
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
