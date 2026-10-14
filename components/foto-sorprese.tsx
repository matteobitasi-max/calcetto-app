'use client'

import { startTransition, useActionState, useState, useTransition } from 'react'
import type { FormState } from '@/app/actions'
import { useSceltaFoto } from './scelta-foto'

// Le foto sorpresa della lega: griglia con ✕ per toglierle e "+" per aggiungerne
// (fotocamera o libreria), caricate subito.
export function FotoSorpreseEditor({
  foto,
  aggiungi,
  rimuovi,
}: {
  foto: { key: string; url: string }[]
  aggiungi: (prev: FormState, fd: FormData) => Promise<FormState>
  rimuovi: (key: string) => Promise<void>
}) {
  const [state, formAction, caricando] = useActionState(aggiungi, undefined)
  const [anteprima, setAnteprima] = useState<string | null>(null)
  const [togliendo, startTogli] = useTransition()
  const scelta = useSceltaFoto({
    titolo: 'Nuova foto sorpresa',
    onFoto: (f) => {
      setAnteprima(URL.createObjectURL(f))
      const fd = new FormData()
      fd.set('foto', f)
      startTransition(() => formAction(fd))
    },
  })

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {foto.map((f) => (
          <div key={f.key} className="relative aspect-square overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
            {/* eslint-disable-next-line @next/next/no-img-element -- immagine già ridimensionata dal CDN di Sanity */}
            <img src={f.url} alt="" className={`h-full w-full object-cover ${togliendo ? 'opacity-60' : ''}`} />
            <button
              type="button"
              disabled={togliendo}
              onClick={() => confirm('Togliere questa foto?') && startTogli(() => rimuovi(f.key))}
              className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-sm text-white"
              aria-label="Togli foto"
            >
              ✕
            </button>
          </div>
        ))}
        {caricando && anteprima && (
          <div className="relative aspect-square overflow-hidden rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element -- anteprima locale (blob:) */}
            <img src={anteprima} alt="" className="h-full w-full object-cover opacity-50" />
            <span className="absolute inset-0 flex items-center justify-center text-white">…</span>
          </div>
        )}
        <button
          type="button"
          onClick={scelta.apri}
          disabled={caricando}
          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-zinc-300 text-sm text-zinc-500 hover:border-green-600 hover:text-green-700 dark:border-zinc-700"
        >
          <span className="text-2xl">＋</span>
          Aggiungi
        </button>
      </div>
      {state?.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      {foto.length > 0 && (
        <button
          type="button"
          // stessa cosa che succede scuotendo il telefono (dopo aver salvato, le foto nuove ci sono)
          onClick={() => window.dispatchEvent(new Event('scossa'))}
          className="mt-3 text-sm font-medium text-green-700 hover:underline dark:text-green-500"
        >
          📳 Prova: mostra una foto a caso
        </button>
      )}
      {scelta.menu}
    </div>
  )
}
