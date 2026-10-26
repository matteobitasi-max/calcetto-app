'use client'

import { useRef, useState } from 'react'
import { useSceltaFoto } from './scelta-foto'
import { inputClass } from './ui-classes'

// Impostazioni lega: il logo (si tocca per scattare o scegliere) con accanto il nome. Il titolo e l'iniziale
// nel logo seguono il nome mentre lo si scrive. Invia `logo`, `nome` ed eventualmente `rimuoviFoto`.
export function LegaNomeLogo({ nomeIniziale, logoUrl }: { nomeIniziale: string; logoUrl?: string | null }) {
  const [nome, setNome] = useState(nomeIniziale)
  const [anteprima, setAnteprima] = useState(logoUrl ?? null)
  const input = useRef<HTMLInputElement>(null)
  const scelta = useSceltaFoto({
    titolo: 'Logo della lega',
    onFoto: (foto) => {
      const dt = new DataTransfer()
      dt.items.add(foto)
      input.current!.files = dt.files
      // il modulo deve accorgersi della modifica (per mostrare "Salva")
      input.current!.dispatchEvent(new Event('change', { bubbles: true }))
      setAnteprima(URL.createObjectURL(foto))
    },
  })

  return (
    <div className="space-y-3">
      <h2 className="truncate font-semibold">{nome.trim() || 'La tua lega'}</h2>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={scelta.apri}
          aria-label="Cambia il logo"
          className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-green-600 text-3xl font-bold text-white"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- anteprima locale (blob:) o miniatura del CDN */}
          {anteprima ? <img src={anteprima} alt="" className="h-full w-full object-cover" /> : (nome.trim()[0] ?? '?').toUpperCase()}
          <span className="absolute bottom-1 right-1 rounded-full bg-black/50 px-1 text-xs" aria-hidden>
            📷
          </span>
        </button>
        <label className="block min-w-0 flex-1 space-y-1 text-sm">
          <span className="font-medium">Nome della lega</span>
          <input name="nome" required minLength={2} maxLength={40} value={nome} onChange={(e) => setNome(e.target.value)} className={inputClass} />
        </label>
      </div>
      <input ref={input} type="file" name="logo" accept="image/*" hidden />
      {logoUrl && (
        <label className="flex items-center gap-2 text-sm text-zinc-500">
          <input type="checkbox" name="rimuoviFoto" className="accent-red-600" /> Rimuovi il logo
        </label>
      )}
      {scelta.menu}
    </div>
  )
}
