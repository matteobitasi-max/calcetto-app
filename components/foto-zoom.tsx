'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '@/components/lingua'

// Foto profilo toccabile: si apre ingrandita sopra la pagina (un tocco o Esc la chiude).
export function FotoZoom({ piccola, grande, nome, size }: { piccola: string; grande: string; nome: string; size: number }) {
  const t = useT()
  const [aperta, setAperta] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          // dentro un link (es. una riga della classifica) apre la foto, non la pagina
          e.preventDefault()
          e.stopPropagation()
          setAperta(true)
        }}
        aria-label={t('Ingrandisci la foto di {nome}', { nome })}
        className="shrink-0 rounded-full"
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- miniatura già ridimensionata dal CDN di Sanity */}
        <img src={piccola} alt="" width={size} height={size} className="h-full w-full rounded-full object-cover" />
      </button>
      {aperta && <FotoIngrandita url={grande} nome={nome} chiudi={() => setAperta(false)} />}
    </>
  )
}

// La foto grande a tutto schermo, direttamente nel body (sopra intestazione e menu).
export function FotoIngrandita({ url, nome, chiudi }: { url: string; nome: string; chiudi: () => void }) {
  const t = useT()
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && chiudi()
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [chiudi])

  return createPortal(
    <div
      role="dialog"
      aria-label={t('Foto di {nome}', { nome })}
      onClick={chiudi}
      className="fixed inset-0 z-[60] flex animate-[zoom_150ms_ease-out] flex-col items-center justify-center gap-4 bg-black/85 p-6 backdrop-blur-sm"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- immagine dal CDN di Sanity */}
      <img src={url} alt={nome} className="max-h-[75vh] w-auto max-w-full rounded-3xl object-contain shadow-2xl ring-4 ring-white" />
      <p className="text-lg font-semibold text-white">{nome}</p>
      <button
        type="button"
        onClick={chiudi}
        aria-label={t('Chiudi')}
        className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg text-zinc-900 shadow-lg"
      >
        ✕
      </button>
    </div>,
    document.body,
  )
}
