'use client'

import { startTransition, useActionState, useRef, useState } from 'react'
import type { FormState } from '@/app/actions'
import { shrinkImage } from '@/lib/shrink-image'

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
  const menu = useRef<HTMLDialogElement>(null)
  const fotocamera = useRef<HTMLInputElement>(null)
  const libreria = useRef<HTMLInputElement>(null)
  const [state, formAction, pending] = useActionState(cambia ?? (async () => undefined), undefined)
  const [anteprima, setAnteprima] = useState<string | null>(null)

  const immagine = anteprima ?? piccola
  const iniziale = (
    <span className="flex h-full w-full items-center justify-center bg-green-600 font-bold text-white">
      {nome.slice(0, 1).toUpperCase()}
    </span>
  )

  const scegli = (input: HTMLInputElement | null) => {
    menu.current?.close()
    input?.click()
  }

  const carica = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const small = await shrinkImage(file).catch(() => file)
    setAnteprima(URL.createObjectURL(small))
    const fd = new FormData()
    fd.set('logo', small)
    startTransition(() => formAction(fd))
  }

  const voce = 'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800'

  return (
    <>
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => (cambia ? menu.current?.showModal() : grande && zoom.current?.showModal())}
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

      {cambia && (
        <>
          <dialog
            ref={menu}
            onClick={(e) => e.target === e.currentTarget && menu.current?.close()}
            className="mx-auto mb-0 mt-auto w-full max-w-md rounded-t-3xl bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-zinc-900 backdrop:bg-black/50 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <p className="px-4 pb-2 pt-1 text-center text-sm text-zinc-500">Immagine di {nome}</p>
            <button type="button" className={voce} onClick={() => scegli(fotocamera.current)}>
              📷 Scatta una foto
            </button>
            <button type="button" className={voce} onClick={() => scegli(libreria.current)}>
              🖼️ Scegli dalla libreria
            </button>
            {grande && (
              <button
                type="button"
                className={voce}
                onClick={() => {
                  menu.current?.close()
                  zoom.current?.showModal()
                }}
              >
                🔍 Vedi ingrandita
              </button>
            )}
            <button type="button" className={`${voce} justify-center text-zinc-500`} onClick={() => menu.current?.close()}>
              Annulla
            </button>
          </dialog>
          <input ref={fotocamera} type="file" accept="image/*" capture="environment" hidden onChange={carica} />
          <input ref={libreria} type="file" accept="image/*" hidden onChange={carica} />
        </>
      )}

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
