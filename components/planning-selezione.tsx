'use client'

import { useEffect, useRef, useSyncExternalStore } from 'react'
import { useSearchParams } from 'next/navigation'
import { ActionForm } from './action-form'
import { SubmitButton } from './submit-button'
import { inputClass } from './ui-classes'
import { escludiDallApp, salvaPrenotazione } from '@/app/centro-actions'
import { nomeDurata } from '@/lib/durata'

// Il planning del giorno: si trascina il mouse su una colonna per selezionare più mezz'ore (sul telefono un
// tocco seleziona un'ora). A destra compare il pannello per prenotare la selezione o escluderla dall'app.

type Sel = { campo: string; da: number; a: number } // indici delle mezz'ore [da, a)
let selezione: Sel | null = null
const ascoltatori = new Set<() => void>()
const imposta = (s: Sel | null) => {
  selezione = s
  ascoltatori.forEach((f) => f())
}
const iscriviti = (f: () => void) => {
  ascoltatori.add(f)
  return () => ascoltatori.delete(f)
}
const useSelezione = () =>
  useSyncExternalStore(
    iscriviti,
    () => selezione,
    () => null,
  )

const hhmm = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

// Le mezz'ore di una colonna (un campo): trascinando si seleziona, al rilascio si apre il pannello.
export function ColonnaSlot({ campo, nome, apre, slot, altezza }: { campo: string; nome: string; apre: number; slot: number; altezza: number }) {
  const sel = useSelezione()
  const trascino = useRef<{ ancora: number; mosso: boolean } | null>(null)

  useEffect(() => {
    const fine = () => {
      const t = trascino.current
      trascino.current = null
      // un clic senza trascinare: un'ora (due mezz'ore), se c'è spazio
      if (t && !t.mosso && selezione?.campo === campo) imposta({ campo, da: t.ancora, a: Math.min(t.ancora + 2, slot) })
    }
    window.addEventListener('pointerup', fine)
    return () => window.removeEventListener('pointerup', fine)
  }, [campo, slot])

  return (
    <div className="absolute inset-0 select-none" style={{ touchAction: 'pan-y' }}>
      {Array.from({ length: slot }, (_, i) => {
        const dentro = sel?.campo === campo && i >= sel.da && i < sel.a
        return (
          <div
            key={i}
            role="button"
            tabIndex={-1}
            aria-label={`${nome} ${hhmm(apre + i * 30)}`}
            onPointerDown={(e) => {
              if (e.pointerType !== 'mouse') return
              e.preventDefault()
              trascino.current = { ancora: i, mosso: false }
              imposta({ campo, da: i, a: i + 1 })
            }}
            onPointerEnter={() => {
              const t = trascino.current
              if (!t) return
              t.mosso = t.mosso || i !== t.ancora
              imposta({ campo, da: Math.min(t.ancora, i), a: Math.max(t.ancora, i) + 1 })
            }}
            onClick={(e) => {
              // tocco (telefono, tablet): un'ora da lì
              if ((e.nativeEvent as PointerEvent).pointerType === 'mouse') return
              imposta({ campo, da: i, a: Math.min(i + 2, slot) })
            }}
            className={`cursor-pointer border-b ${i % 2 ? 'border-stone-200 dark:border-zinc-800' : 'border-stone-100 dark:border-zinc-800/60'} ${
              dentro ? 'bg-orange-200/80 dark:bg-orange-800/50' : 'hover:bg-orange-50 dark:hover:bg-orange-950/40'
            }`}
            style={{ height: altezza }}
          />
        )
      })}
    </div>
  )
}

type CampoInfo = { key: string; nome: string; prezzoOra: number }

// Il pannello a destra (sul telefono in basso): la selezione e cosa farne.
export function PannelloSelezione({ campi, giorno, apre, appSpente }: { campi: CampoInfo[]; giorno: string; apre: number; appSpente: boolean }) {
  const sel = useSelezione()
  const parametri = useSearchParams()
  // cambiando giorno o dopo un salvataggio (la pagina torna con nuovi parametri) la selezione si chiude
  const chiave = parametri.toString()
  useEffect(() => () => imposta(null), [chiave])

  const campo = sel ? campi.find((c) => c.key === sel.campo) : null
  if (!sel || !campo) {
    return (
      <div className="hidden rounded-2xl border border-dashed border-stone-300 p-4 text-sm text-stone-500 dark:border-zinc-700 lg:block">
        <p className="font-semibold text-stone-700 dark:text-zinc-200">🖱️ Seleziona sul planning</p>
        <p className="mt-1">Trascina il mouse su un campo per scegliere uno o più orari (un clic = un’ora). Poi qui puoi prenotarli o escluderli dalle prenotazioni dall’app.</p>
      </div>
    )
  }

  const inizio = apre + sel.da * 30
  const durata = (sel.a - sel.da) * 30
  const ora = hhmm(inizio)
  const prezzo = Math.round(((campo.prezzoOra * durata) / 60) * 100) / 100
  const giornoTesto = new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${giorno}T12:00:00Z`))
  const nascosti = (
    <>
      <input type="hidden" name="campo" value={campo.key} />
      <input type="hidden" name="giorno" value={giorno} />
      <input type="hidden" name="ora" value={ora} />
      <input type="hidden" name="durata" value={durata} />
    </>
  )
  const settimane = (
    <select name="settimane" defaultValue="1" className={inputClass}>
      <option value="1">Solo questa volta</option>
      {[4, 8, 12, 16, 24, 30, 40].map((n) => (
        <option key={n} value={n}>
          Ogni settimana, per {n} settimane
        </option>
      ))}
    </select>
  )

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 max-h-[75vh] overflow-y-auto rounded-t-3xl border-t border-stone-200 bg-white p-4 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 lg:sticky lg:top-32 lg:z-0 lg:max-h-[calc(100vh-9rem)] lg:rounded-2xl lg:border lg:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">Selezione</p>
          <p className="font-extrabold">{campo.nome}</p>
          <p className="text-sm capitalize text-stone-600 dark:text-zinc-300">
            {giornoTesto} · {ora}–{hhmm(inizio + durata)} · {nomeDurata(durata)}
          </p>
        </div>
        <button type="button" onClick={() => imposta(null)} aria-label="Chiudi" className="rounded-lg px-2 text-xl text-stone-400 hover:bg-stone-100 dark:hover:bg-zinc-800">
          ✕
        </button>
      </div>

      <details open className="mt-3 rounded-xl border border-stone-200 p-3 dark:border-zinc-800">
        <summary className="cursor-pointer font-bold">📅 Prenota</summary>
        <ActionForm key={`p-${sel.campo}-${sel.da}-${sel.a}`} action={salvaPrenotazione.bind(null, null)} className="mt-3 space-y-2.5 text-sm">
          {nascosti}
          <input name="cliente" required maxLength={80} placeholder="Chi prenota (nome o squadra)" className={inputClass} />
          <input name="email" type="email" maxLength={120} placeholder="Email (se è su The Cap si collega alla sua partita)" className={inputClass} />
          <input name="telefono" type="tel" maxLength={30} placeholder="Telefono" className={inputClass} />
          <input name="prezzo" inputMode="decimal" placeholder={`Prezzo: ${prezzo} € (vuoto = prezzo del campo)`} className={inputClass} />
          {settimane}
          <SubmitButton className="w-full rounded-xl bg-orange-500 py-2.5 font-bold text-white hover:bg-orange-600">Prenota</SubmitButton>
        </ActionForm>
      </details>

      <details className="mt-2 rounded-xl border border-stone-200 p-3 dark:border-zinc-800">
        <summary className="cursor-pointer font-bold">🚫 Escludi dall’app</summary>
        <p className="mt-2 text-xs text-stone-500">
          {appSpente
            ? 'Le prenotazioni dall’app sono spente (Impostazioni): per ora non serve.'
            : 'Questi orari non compaiono tra quelli liberi per chi prenota dall’app. Dal gestionale restano prenotabili.'}
        </p>
        <ActionForm key={`e-${sel.campo}-${sel.da}-${sel.a}`} action={escludiDallApp} className="mt-2 space-y-2.5 text-sm">
          {nascosti}
          <input name="nota" maxLength={120} placeholder="Motivo (facoltativo): scuola calcio, manutenzione…" className={inputClass} />
          {settimane}
          <SubmitButton className="w-full rounded-xl bg-stone-800 py-2.5 font-bold text-white hover:bg-stone-900 dark:bg-zinc-700">Escludi dall’app</SubmitButton>
        </ActionForm>
      </details>
    </div>
  )
}
