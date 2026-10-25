'use client'

import { useContext, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { useFormStatus } from 'react-dom'
import { EsitoModulo } from './action-form'

// Pillole visibili nella pagina, in ordine: se più moduli sono modificati, si impilano.
let visibili: string[] = []
const ascoltatori = new Set<() => void>()
const pilaCambiata = () => ascoltatori.forEach((f) => f())
const iscriviti = (f: () => void) => {
  ascoltatori.add(f)
  return () => ascoltatori.delete(f)
}
const nessuna: string[] = []

// Il contenuto del modulo, per capire se è diverso da com'era (le foto per nome e peso).
const firma = (form: HTMLFormElement) =>
  JSON.stringify([...new FormData(form)].map(([k, v]) => [k, typeof v === 'string' ? v : `${v.name}:${v.size}`]))

// Pillola "Salva" fissa in basso a destra (come "+ Nuova partita"): compare quando il modulo
// che la contiene è diverso da com'era, sparisce se si torna come prima o dopo un salvataggio
// riuscito. Confronta il contenuto dopo ogni tocco, così vede anche calendari e selettori.
// `quando="completo"` (moduli nuovi): compare invece quando tutti i campi obbligatori sono compilati.
export function PillSalva({ label = 'Salva', quando = 'modificato' }: { label?: string; quando?: 'modificato' | 'completo' }) {
  const id = useId()
  const segnaposto = useRef<HTMLSpanElement>(null)
  const iniziale = useRef<string | null>(null)
  const [modificato, setModificato] = useState(false)
  const { pending } = useFormStatus()
  const esito = useContext(EsitoModulo)
  const eraInCorso = useRef(false)

  useEffect(() => {
    const form = segnaposto.current?.closest('form')
    if (!form) return
    let attesa: ReturnType<typeof setTimeout> | undefined
    const controlla = () => {
      clearTimeout(attesa)
      attesa = setTimeout(() => {
        if (quando === 'completo') setModificato(form.checkValidity())
        else if (iniziale.current != null) setModificato(firma(form) !== iniziale.current)
      }, 60)
    }
    // il punto di partenza si prende quando i campi hanno finito di inizializzarsi
    const avvio = setTimeout(() => {
      iniziale.current = firma(form)
      if (quando === 'completo') controlla()
    }, 300)
    const eventi = ['input', 'change', 'click', 'keyup'] as const
    for (const e of eventi) form.addEventListener(e, controlla)
    return () => {
      clearTimeout(avvio)
      clearTimeout(attesa)
      for (const e of eventi) form.removeEventListener(e, controlla)
    }
  }, [quando])

  // Salvataggio finito senza errori: quello di adesso diventa il nuovo punto di partenza.
  useEffect(() => {
    if (pending) {
      eraInCorso.current = true
      return
    }
    if (!eraInCorso.current) return
    eraInCorso.current = false
    const form = segnaposto.current?.closest('form')
    if (form && !esito?.error && quando === 'modificato') {
      iniziale.current = firma(form)
      setModificato(false)
    }
  }, [pending, esito, quando])

  const visibile = modificato || pending
  useEffect(() => {
    visibili = visibile ? [...visibili.filter((v) => v !== id), id] : visibili.filter((v) => v !== id)
    pilaCambiata()
    return () => {
      visibili = visibili.filter((v) => v !== id)
      pilaCambiata()
    }
  }, [visibile, id])
  const pila = useSyncExternalStore(iscriviti, () => visibili, () => nessuna)
  const posto = Math.max(0, pila.indexOf(id))

  return (
    <>
      <span ref={segnaposto} hidden />
      <button
        type="submit"
        disabled={pending}
        aria-hidden={!visibile}
        tabIndex={visibile ? 0 : -1}
        style={{ marginBottom: posto * 60 }}
        className={`fixed right-4 z-20 inline-flex items-center gap-1.5 rounded-full bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-green-900/20 transition-all duration-300 hover:bg-green-700 disabled:opacity-80 bottom-[max(1.25rem,calc(var(--safe-area-inset-bottom,env(safe-area-inset-bottom))_+_0.75rem))] ${
          visibile ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-24 opacity-0'
        }`}
      >
        {pending ? (
          'Salvo…'
        ) : (
          <>
            <span className="text-base leading-none">✓</span> {label}
          </>
        )}
      </button>
    </>
  )
}
