'use client'

import { startTransition, useActionState, useRef, useState } from 'react'
import type { FormState } from '@/app/actions'
import { useSceltaFoto, voceMenuFoto } from './scelta-foto'

// L'immagine della lega nell'intestazione: toccandola si apre ingrandita.
// Per l'organizzatore (con `cambia`) si apre invece un menu: scatta una foto,
// scegli dalla libreria o vedi l'immagine ingrandita.
// Senza immagine si vede l'iniziale del nome della lega.
export function LegaZoom({
  nome,
  piccola,
  grande,
  cambia,
}: {
  nome: string
  piccola: string | null
  grande: string | null
  cambia?: (prev: FormState, fd: FormData) => Promise<FormState>
}) {
  const zoom = useRef<HTMLDialogElement>(null)
  const [state, formAction, pending] = useActionState(cambia ?? (async () => undefined), undefined)
  const [anteprima, setAnteprima] = useState<string | null>(null)

  const immagine = anteprima ?? piccola
  const iniziale = (
    <span className="flex h-full w-full items-center justify-center bg-green-600 font-bold text-white">
      {nome.slice(0, 1).toUpperCase()}
    </span>
  )

  const scelta = useSceltaFoto({
    titolo: `Immagine di ${nome}`,
    onFoto: (foto) => {
      setAnteprima(URL.createObjectURL(foto))
      const fd = new FormData()
      fd.set('logo', foto)
      startTransition(() => formAction(fd))
    },
    altro: grande && (
      <button
        type="button"
        className={voceMenuFoto}
        onClick={(e) => {
          e.currentTarget.closest('dialog')?.close()
          zoom.current?.showModal()
        }}
      >
        🔍 Vedi ingrandita
      </button>
    ),
  })

  return (
    <>
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => (cambia ? scelta.apri() : grande && zoom.current?.showModal())}
          disabled={pending}
          className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl shadow ring-2 ring-white dark:ring-zinc-800"
          aria-label={cambia ? `Cambia l'immagine di ${nome}` : grande ? `Ingrandisci l'immagine di ${nome}` : nome}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- immagine già ridimensionata dal CDN di Sanity */}
          {immagine ? <img src={immagine} alt="" className="h-full w-full object-cover" /> : iniziale}
          {pending && <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">…</span>}
        </button>
        {state?.error && (
          <p className="absolute left-0 top-full z-10 mt-1 w-48 rounded-lg bg-white p-2 text-xs text-red-600 shadow dark:bg-zinc-900">
            {state.error}
          </p>
        )}
      </div>

      {cambia && scelta.menu}

      {grande && (
        <dialog
          ref={zoom}
          // un tocco sullo sfondo (fuori dall'immagine) chiude
          onClick={(e) => e.target === e.currentTarget && zoom.current?.close()}
          className="m-auto max-h-none max-w-none bg-transparent p-4 backdrop:bg-black/75 backdrop:backdrop-blur-sm open:animate-[zoom_150ms_ease-out]"
        >
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element -- immagine dal CDN di Sanity */}
            <img
              src={grande}
              alt={nome}
              className="h-auto max-h-[85vh] w-[min(85vw,85vh,640px)] rounded-3xl object-contain shadow-2xl ring-4 ring-white"
            />
            <button
              type="button"
              onClick={() => zoom.current?.close()}
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
