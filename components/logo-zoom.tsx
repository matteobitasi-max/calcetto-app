'use client'

import { useRef } from 'react'

// L'immagine della lega nell'intestazione: toccandola si apre ingrandita.
// Senza immagine si vede l'iniziale del nome della lega.
export function LegaZoom({ nome, piccola, grande }: { nome: string; piccola: string | null; grande: string | null }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const iniziale = (
    <span className="flex h-full w-full items-center justify-center bg-green-600 font-bold text-white">{nome.slice(0, 1).toUpperCase()}</span>
  )

  return (
    <>
      <button
        type="button"
        onClick={() => grande && dialog.current?.showModal()}
        className="h-10 w-10 shrink-0 overflow-hidden rounded-xl shadow ring-2 ring-white dark:ring-zinc-800"
        aria-label={grande ? `Ingrandisci l'immagine di ${nome}` : nome}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- immagine già ridimensionata dal CDN di Sanity */}
        {piccola ? <img src={piccola} alt="" className="h-full w-full object-cover" /> : iniziale}
      </button>
      {grande && (
        <dialog
          ref={dialog}
          // un tocco sullo sfondo (fuori dall'immagine) chiude
          onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
          className="m-auto max-h-none max-w-none bg-transparent p-4 backdrop:bg-black/75 backdrop:backdrop-blur-sm open:animate-[zoom_150ms_ease-out]"
        >
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element -- immagine dal CDN di Sanity */}
            <img src={grande} alt={nome} className="h-auto max-h-[85vh] w-[min(85vw,85vh,640px)] rounded-3xl object-contain shadow-2xl ring-4 ring-white" />
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="absolute -right-3 -top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg text-zinc-900 shadow-lg"
              aria-label="Chiudi"
            >
              ✕
            </button>
          </div>
        </dialog>
      )}
    </>
  )
}
