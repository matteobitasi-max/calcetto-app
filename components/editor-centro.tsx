'use client'

import { useState } from 'react'
import { ActionForm } from './action-form'
import { PillSalva } from './pill-salva'
import { inputClass } from './ui-classes'
import { salvaCampi, salvaOrari } from '@/app/centro-actions'
import { GIORNI_SETTIMANA, MEZZORE, type OrarioGiorno } from '@/lib/orari-centro'

const TIPI = [5, 6, 7, 8, 9, 11]
const piccolo = `${inputClass} !px-2 !py-1.5`

type RigaCampo = { id: string; key?: string; nome: string; tipo: number; coperto: boolean; prezzoOra: string }

// Campi e prezzi in una tabella: ogni riga un campo (nome, tipo, dentro o fuori, € all'ora), ✕ per toglierlo,
// "+ Aggiungi campo" (copia il tipo e il prezzo dell'ultimo) e un solo Salva.
export function EditorCampi({ iniziali }: { iniziali: { key: string; nome: string; tipo: number; coperto?: boolean; prezzoOra: number }[] }) {
  const [righe, setRighe] = useState<RigaCampo[]>(() => iniziali.map((c) => ({ id: c.key, key: c.key, nome: c.nome, tipo: c.tipo, coperto: !!c.coperto, prezzoOra: String(c.prezzoOra) })))
  const cambia = (id: string, x: Partial<RigaCampo>) => setRighe((r) => r.map((y) => (y.id === id ? { ...y, ...x } : y)))
  const aggiungi = () =>
    setRighe((r) => {
      const ultimo = r.at(-1)
      return [...r, { id: `nuovo-${Date.now()}`, nome: `Campo ${r.length + 1}`, tipo: ultimo?.tipo ?? 5, coperto: ultimo?.coperto ?? false, prezzoOra: ultimo?.prezzoOra ?? '70' }]
    })

  return (
    <ActionForm action={salvaCampi} className="space-y-2">
      <input type="hidden" name="campi" value={JSON.stringify(righe.map(({ key, nome, tipo, coperto, prezzoOra }) => ({ key, nome, tipo, coperto, prezzoOra })))} />
      <div className="hidden grid-cols-[1fr_7.5rem_7rem_5.5rem_2rem] gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-stone-500 sm:grid">
        <span>Nome</span>
        <span>Tipo</span>
        <span>Dove</span>
        <span>€ / ora</span>
        <span />
      </div>
      {righe.map((r) => (
        <div key={r.id} className="grid grid-cols-[1fr_2rem] gap-2 rounded-xl bg-stone-50 p-2 dark:bg-zinc-950 sm:grid-cols-[1fr_7.5rem_7rem_5.5rem_2rem] sm:bg-transparent sm:p-0 sm:dark:bg-transparent">
          <input value={r.nome} onChange={(e) => cambia(r.id, { nome: e.target.value })} maxLength={40} aria-label="Nome del campo" className={piccolo} />
          <button type="button" onClick={() => setRighe((x) => x.filter((y) => y.id !== r.id))} aria-label={`Togli ${r.nome}`} className="row-span-1 rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-600 sm:order-last dark:hover:bg-red-950">
            ✕
          </button>
          <div className="col-span-2 grid grid-cols-3 gap-2 sm:contents">
            <select value={r.tipo} onChange={(e) => cambia(r.id, { tipo: Number(e.target.value) })} aria-label="Tipo" className={piccolo}>
              {TIPI.map((t) => (
                <option key={t} value={t}>
                  a {t}
                </option>
              ))}
            </select>
            <select value={r.coperto ? '1' : '0'} onChange={(e) => cambia(r.id, { coperto: e.target.value === '1' })} aria-label="Dove" className={piccolo}>
              <option value="0">🌤️ Fuori</option>
              <option value="1">🏠 Dentro</option>
            </select>
            <input value={r.prezzoOra} onChange={(e) => cambia(r.id, { prezzoOra: e.target.value })} inputMode="decimal" aria-label="Euro all’ora" className={piccolo} />
          </div>
        </div>
      ))}
      <button type="button" onClick={aggiungi} className="w-full rounded-xl border border-dashed border-stone-300 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-50 dark:border-zinc-700 dark:text-orange-400 dark:hover:bg-orange-950/40">
        + Aggiungi campo
      </button>
      <p className="text-xs text-stone-500">Il prezzo orario propone il prezzo di ogni prenotazione (si può sempre cambiare). Un campo tolto esce dal planning; le sue prenotazioni passate restano nei conti.</p>
      <PillSalva label="Salva campi" />
    </ActionForm>
  )
}

// Gli orari della settimana: per ogni giorno aperto (dalle … alle …) o chiuso; "uguale per tutti" copia il lunedì.
export function EditorOrari({ iniziali }: { iniziali: OrarioGiorno[] }) {
  const [orari, setOrari] = useState<OrarioGiorno[]>(iniziali)
  const cambia = (i: number, x: Partial<OrarioGiorno>) => setOrari((o) => o.map((y, k) => (k === i ? { ...y, ...x } : y)))
  const scelta = (valore: string, onChange: (v: string) => void, etichetta: string, disabilitato: boolean) => (
    <select value={valore} onChange={(e) => onChange(e.target.value)} disabled={disabilitato} aria-label={etichetta} className={`${piccolo} disabled:opacity-40`}>
      {MEZZORE.map((m) => (
        <option key={m} value={m}>
          {m}
        </option>
      ))}
    </select>
  )
  return (
    <ActionForm action={salvaOrari} className="space-y-2">
      <input type="hidden" name="orari" value={JSON.stringify(orari)} />
      {orari.map((o, i) => (
        <div key={i} className="grid grid-cols-[6.5rem_auto_1fr_1fr] items-center gap-2 text-sm">
          <span className="font-semibold">{GIORNI_SETTIMANA[i]}</span>
          <button
            type="button"
            onClick={() => cambia(i, { chiuso: !o.chiuso })}
            className={`rounded-full px-2.5 py-1 text-xs font-bold ${o.chiuso ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200' : 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200'}`}
          >
            {o.chiuso ? 'Chiuso' : 'Aperto'}
          </button>
          {scelta(o.apre, (v) => cambia(i, { apre: v }), `${GIORNI_SETTIMANA[i]}: apre`, !!o.chiuso)}
          {scelta(o.chiude, (v) => cambia(i, { chiude: v }), `${GIORNI_SETTIMANA[i]}: chiude`, !!o.chiuso)}
        </div>
      ))}
      <button
        type="button"
        onClick={() => setOrari((o) => o.map((y) => ({ ...y, apre: o[0].apre, chiude: o[0].chiude })))}
        className="text-xs font-semibold text-orange-700 hover:underline dark:text-orange-400"
      >
        Stesso orario del lunedì per tutti i giorni
      </button>
      <PillSalva label="Salva orari" />
    </ActionForm>
  )
}
