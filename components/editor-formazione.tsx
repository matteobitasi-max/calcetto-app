'use client'

import { useActionState, useState } from 'react'
import type { FormState } from '@/app/actions'
import { MODULI, SIGLA, posti, proponi, type Formato } from '@/lib/moduli'
import { CampoTitolari, type Pedina } from './campo-titolari'
import { useT } from './lingua'
import { buttonClass, inputClass } from './ui-classes'

export type Candidato = Pedina & { ruolo?: string; forza: number }

// Club: l'allenatore sceglie il modulo e chi va in ogni posto. Tocca un posto sul campo e poi un giocatore
// (oppure usa i menu sotto). "Proponi" rifà la formazione da ruoli e forza; chi non è in campo va in panchina.
export function EditorFormazione({
  azione,
  formato,
  moduloIniziale,
  postiIniziali,
  candidati,
}: {
  azione: (prev: FormState, fd: FormData) => Promise<FormState>
  formato: Formato
  moduloIniziale: string
  /** un id (o null) per ogni posto del modulo iniziale */
  postiIniziali: (string | null)[]
  candidati: Candidato[]
}) {
  const t = useT()
  const [stato, invia, invio] = useActionState(azione, undefined)
  const [modulo, setModulo] = useState(moduloIniziale)
  const [scelti, setScelti] = useState<(string | null)[]>(postiIniziali)
  const [attivo, setAttivo] = useState<number | null>(null)
  const perId = new Map(candidati.map((c) => [c.id, c]))
  const ps = posti(modulo)
  const inCampo = new Set(scelti.filter(Boolean) as string[])
  const panchina = candidati.filter((c) => !inCampo.has(c.id))

  const cambiaModulo = (m: string) => {
    setModulo(m)
    setScelti(proponi(m, candidati))
    setAttivo(null)
  }
  // mette un giocatore in un posto: se era già in campo, i due si scambiano
  const metti = (posto: number, id: string | null) =>
    setScelti((v) => {
      const n = [...v]
      const prima = id ? n.indexOf(id) : -1
      if (prima >= 0) n[prima] = n[posto] ?? null
      n[posto] = id
      return n
    })

  return (
    <form action={invia} className="space-y-4 pb-24">
      <input type="hidden" name="modulo" value={modulo} />
      {ps.map((p) => (
        <input key={p.indice} type="hidden" name={`posto-${p.indice}`} value={scelti[p.indice] ?? ''} />
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <select value={modulo} onChange={(e) => cambiaModulo(e.target.value)} aria-label={t('Modulo')} className={`${inputClass} w-auto font-semibold`}>
          {MODULI[formato].map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => setScelti(proponi(modulo, candidati))} className={buttonClass('secondary')}>
          ✨ {t('Proponi formazione')}
        </button>
      </div>

      <CampoTitolari modulo={modulo} giocatori={scelti.map((id) => (id ? (perId.get(id) ?? null) : null))} attivo={attivo} onTocca={(i) => setAttivo(attivo === i ? null : i)} />

      {attivo != null && (
        <div className="space-y-2 rounded-xl border-2 border-yellow-300 bg-yellow-50 p-3 dark:bg-yellow-950/30">
          <p className="text-sm font-semibold">
            {t('Chi va in questo posto?')} <span className="text-zinc-500">({SIGLA[ps[attivo].ruolo]})</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {candidati.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  metti(attivo, c.id)
                  setAttivo(null)
                }}
                className={`rounded-full border px-2.5 py-1 text-xs ${scelti[attivo] === c.id ? 'border-green-600 bg-green-600 text-white' : inCampo.has(c.id) ? 'border-zinc-300 text-zinc-500 dark:border-zinc-700' : 'border-zinc-400 bg-white font-semibold dark:bg-zinc-900'}`}
              >
                {c.numero != null && `${c.numero} `}
                {c.nome}
                {c.ruolo && <span className="opacity-60"> · {c.ruolo.slice(0, 3)}</span>}
              </button>
            ))}
            {scelti[attivo] && (
              <button type="button" onClick={() => (metti(attivo, null), setAttivo(null))} className="rounded-full border border-red-300 px-2.5 py-1 text-xs text-red-700 dark:text-red-400">
                {t('Lascia vuoto')}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          🪑 {t('Panchina')} ({panchina.length})
        </p>
        {panchina.length === 0 ? (
          <p className="text-sm text-zinc-500">{t('Nessuno in panchina.')}</p>
        ) : (
          <p className="text-sm">{panchina.map((c) => `${c.numero != null ? `${c.numero} ` : ''}${c.nome}`).join(' · ')}</p>
        )}
      </div>

      {stato?.error && <p className="text-sm text-red-600 dark:text-red-400">{stato.error}</p>}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-200 bg-white/95 p-4 pb-[max(1rem,var(--safe-area-inset-bottom,env(safe-area-inset-bottom)))] backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <button type="submit" disabled={invio} className={`${buttonClass('primary')} mx-auto block w-full max-w-md py-3`}>
          {invio ? t('Salvo…') : t('Salva formazione')}
        </button>
      </div>
    </form>
  )
}
