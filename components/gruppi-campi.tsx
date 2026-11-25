'use client'

import { useState } from 'react'
import { inputClass } from './ui-classes'

const TIPI = [5, 6, 7, 8, 9, 11]
type Riga = { id: number; tipo: number; coperto: boolean; quanti: number; prezzo: string }

// Creazione del centro: i campi a gruppi (es. 3 a 5 coperti, 1 a 7 all'aperto, 1 a 11), ognuno con il suo
// prezzo orario. Si possono anche saltare e aggiungere dopo nelle impostazioni.
export function GruppiCampi() {
  const [righe, setRighe] = useState<Riga[]>([{ id: 1, tipo: 5, coperto: false, quanti: 2, prezzo: '70' }])
  const [dopo, setDopo] = useState(false)
  const cambia = (id: number, x: Partial<Riga>) => setRighe((r) => r.map((y) => (y.id === id ? { ...y, ...x } : y)))
  const totale = righe.reduce((s, r) => s + (r.quanti || 0), 0)

  if (dopo) {
    return (
      <div className="rounded-xl bg-stone-50 p-3 text-sm dark:bg-zinc-950">
        <input type="hidden" name="saltaCampi" value="1" />
        <p>👍 I campi li aggiungi dopo, in Impostazioni.</p>
        <button type="button" onClick={() => setDopo(false)} className="mt-1 font-semibold text-orange-700 hover:underline dark:text-orange-400">
          No, li inserisco adesso
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {righe.map((r, i) => (
        <div key={r.id} className="grid grid-cols-2 gap-2 rounded-xl bg-stone-50 p-3 dark:bg-zinc-950 sm:grid-cols-[4.5rem_1fr_1fr_6rem_auto] sm:items-end">
          <label className="block space-y-1 text-xs font-medium">
            <span>Quanti</span>
            <input name="quanti" type="number" min={1} max={20} required value={r.quanti} onChange={(e) => cambia(r.id, { quanti: Number(e.target.value) })} className={inputClass} />
          </label>
          <label className="block space-y-1 text-xs font-medium">
            <span>Tipo</span>
            <select name="tipo" value={r.tipo} onChange={(e) => cambia(r.id, { tipo: Number(e.target.value) })} className={inputClass}>
              {TIPI.map((t) => (
                <option key={t} value={t}>
                  Calcio a {t}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-xs font-medium">
            <span>Dove</span>
            <select name="coperto" value={r.coperto ? '1' : '0'} onChange={(e) => cambia(r.id, { coperto: e.target.value === '1' })} className={inputClass}>
              <option value="0">🌤️ Fuori (all’aperto)</option>
              <option value="1">🏠 Dentro (coperto)</option>
            </select>
          </label>
          <label className="block space-y-1 text-xs font-medium">
            <span>€ all’ora</span>
            <input name="prezzo" inputMode="decimal" required value={r.prezzo} onChange={(e) => cambia(r.id, { prezzo: e.target.value })} className={inputClass} />
          </label>
          {righe.length > 1 ? (
            <button
              type="button"
              onClick={() => setRighe((x) => x.filter((y) => y.id !== r.id))}
              aria-label={`Togli il gruppo ${i + 1}`}
              className="justify-self-end rounded-lg px-2 py-2 text-stone-400 hover:bg-stone-200 dark:hover:bg-zinc-800"
            >
              ✕
            </button>
          ) : (
            <span className="hidden sm:block" />
          )}
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <button
          type="button"
          onClick={() => setRighe((x) => [...x, { id: Math.max(...x.map((y) => y.id)) + 1, tipo: 7, coperto: false, quanti: 1, prezzo: '90' }])}
          className="font-semibold text-orange-700 hover:underline dark:text-orange-400"
        >
          + Altri campi (es. a 7 o a 11)
        </button>
        <span className="text-stone-500">{totale === 1 ? '1 campo' : `${totale} campi`}</span>
      </div>
      <button type="button" onClick={() => setDopo(true)} className="text-xs font-medium text-stone-500 hover:underline">
        Preferisco inserirli dopo, dentro il gestionale
      </button>
    </div>
  )
}
