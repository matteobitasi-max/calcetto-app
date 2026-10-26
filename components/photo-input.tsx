'use client'

import { useRef, useState } from 'react'
import { useSceltaFoto } from './scelta-foto'
import { useT } from './lingua'

// Campo foto dei moduli: si scatta o si sceglie una foto, che viene inviata con il modulo
// nel campo `name` (già rimpicciolita).
export function PhotoInput({ currentUrl, name = 'foto' }: { currentUrl?: string | null; name?: string }) {
  const input = useRef<HTMLInputElement>(null)
  const t = useT()
  const [preview, setPreview] = useState(currentUrl ?? null)
  const scelta = useSceltaFoto({
    titolo: t('Foto'),
    onFoto: (foto) => {
      const dt = new DataTransfer()
      dt.items.add(foto)
      input.current!.files = dt.files
      // il modulo deve accorgersi della modifica (es. per mostrare "Salva")
      input.current!.dispatchEvent(new Event('change', { bubbles: true }))
      setPreview(URL.createObjectURL(foto))
    },
  })

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={scelta.apri}
        className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-200 text-2xl dark:bg-zinc-800"
        aria-label={t('Scatta o scegli una foto')}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- anteprima locale (blob:) */}
        {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : '📷'}
      </button>
      <div className="space-y-1 text-sm">
        <button type="button" onClick={scelta.apri} className="rounded-lg bg-zinc-100 px-3 py-2 font-medium dark:bg-zinc-800">
          📷 {preview ? t('Cambia foto') : t('Aggiungi foto')}
        </button>
        <input ref={input} type="file" name={name} accept="image/*" hidden />
        {currentUrl && (
          <label className="flex items-center gap-2 text-zinc-500">
            <input type="checkbox" name="rimuoviFoto" className="accent-red-600" /> Rimuovi foto attuale
          </label>
        )}
      </div>
      {scelta.menu}
    </div>
  )
}
