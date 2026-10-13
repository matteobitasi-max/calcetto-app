'use client'

import { useRef, type ReactNode } from 'react'
import { shrinkImage } from '@/lib/shrink-image'

// Stile di una voce del menu (per le voci aggiunte con `altro`).
export const voceMenuFoto = 'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800'

// Menu dal basso per scegliere una foto: fotocamera o libreria, uguale su iPhone e Android.
// `apri()` lo mostra; `menu` va messo nella pagina; `onFoto` riceve la foto già rimpicciolita.
// `altro` aggiunge voci in fondo (si chiudono con `e.currentTarget.closest('dialog')?.close()`).
export function useSceltaFoto({
  titolo,
  onFoto,
  altro,
}: {
  titolo: string
  onFoto: (foto: File) => void
  altro?: ReactNode
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const fotocamera = useRef<HTMLInputElement>(null)
  const libreria = useRef<HTMLInputElement>(null)
  const chiudi = () => dialog.current?.close()

  const scegli = (input: HTMLInputElement | null) => {
    chiudi()
    input?.click()
  }

  const carica = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) onFoto(await shrinkImage(file).catch(() => file))
  }

  const menu = (
    <>
      <dialog
        ref={dialog}
        // un tocco sullo sfondo chiude
        onClick={(e) => e.target === e.currentTarget && chiudi()}
        className="mx-auto mb-0 mt-auto w-full max-w-md rounded-t-3xl bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-zinc-900 backdrop:bg-black/50 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <p className="px-4 pb-2 pt-1 text-center text-sm text-zinc-500">{titolo}</p>
        <button type="button" className={voceMenuFoto} onClick={() => scegli(fotocamera.current)}>
          📷 Scatta una foto
        </button>
        <button type="button" className={voceMenuFoto} onClick={() => scegli(libreria.current)}>
          🖼️ Scegli dalla libreria
        </button>
        {altro}
        <button type="button" className={`${voceMenuFoto} justify-center text-zinc-500`} onClick={chiudi}>
          Annulla
        </button>
      </dialog>
      <input ref={fotocamera} type="file" accept="image/*" capture="environment" hidden onChange={carica} />
      <input ref={libreria} type="file" accept="image/*" hidden onChange={carica} />
    </>
  )

  return { apri: () => dialog.current?.showModal(), menu }
}
