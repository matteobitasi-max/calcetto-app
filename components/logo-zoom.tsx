'use client'

import Image from 'next/image'
import { useRef } from 'react'

// Il logo nell'intestazione: toccandolo si apre ingrandito.
export function LogoZoom() {
  const dialog = useRef<HTMLDialogElement>(null)

  return (
    <>
      <button type="button" onClick={() => dialog.current?.showModal()} className="shrink-0 rounded-full" aria-label="Ingrandisci il logo">
        <Image src="/logo.png" alt="" width={36} height={36} className="rounded-full shadow ring-2 ring-white dark:ring-zinc-800" priority />
      </button>
      <dialog
        ref={dialog}
        // un tocco sullo sfondo (fuori dall'immagine) chiude
        onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
        className="m-auto max-h-none max-w-none bg-transparent p-4 backdrop:bg-black/75 backdrop:backdrop-blur-sm open:animate-[zoom_150ms_ease-out]"
      >
        <div className="relative">
          <Image
            src="/icon-512.png"
            alt="Logo Calcetto"
            width={512}
            height={512}
            className="h-auto w-[min(85vw,85vh,512px)] rounded-3xl shadow-2xl ring-4 ring-white"
          />
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="absolute -top-3 -right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg text-zinc-900 shadow-lg"
            aria-label="Chiudi"
          >
            ✕
          </button>
        </div>
      </dialog>
    </>
  )
}
