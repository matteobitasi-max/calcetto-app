'use client'

import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { useT } from './lingua'

// Finestra di conferma nello stile dell'app, al posto di quella grigia del browser (window.confirm).
// Si usa da qualsiasi componente: `if (await conferma('Eliminare?')) ...`. La finestra è <Conferme /> nel layout.

export type OpzioniConferma = {
  testo: string
  /** riga in piccolo sotto il testo */
  dettaglio?: string
  ok?: string
  annulla?: string
  /** azione che cancella o non si annulla: pulsante rosso */
  pericolo?: boolean
}

type Richiesta = OpzioniConferma & { risposta: (ok: boolean) => void }

let mostra: ((r: Richiesta) => void) | null = null

export function conferma(opzioni: string | OpzioniConferma): Promise<boolean> {
  const o = typeof opzioni === 'string' ? { testo: opzioni } : opzioni
  // finestra non ancora pronta (non dovrebbe succedere): quella del browser
  if (!mostra) return Promise.resolve(window.confirm(o.testo))
  return new Promise((risposta) => mostra!({ ...o, risposta }))
}

// Riconosce le azioni distruttive dal testo, per le conferme che non lo dicono.
const DISTRUTTIVA = /^(eliminar|toglier|uscire|scolleg|annullar|interromper|unire|cancell)/i

// Per i pulsanti di invio di un form: ferma l'invio, chiede conferma e, se sì, invia il form.
export function confermaInvio(e: MouseEvent<HTMLButtonElement>, opzioni: string | OpzioniConferma) {
  const pulsante = e.currentTarget
  e.preventDefault()
  conferma(opzioni).then((ok) => {
    if (ok && pulsante.isConnected) pulsante.form?.requestSubmit(pulsante)
  })
}

export function Conferme() {
  const t = useT()
  const [richiesta, setRichiesta] = useState<Richiesta | null>(null)
  const okRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    mostra = setRichiesta
    return () => {
      mostra = null
    }
  }, [])

  const chiudi = (ok: boolean) => {
    richiesta?.risposta(ok)
    setRichiesta(null)
  }

  useEffect(() => {
    if (!richiesta) return
    okRef.current?.focus()
    const tasto = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        richiesta.risposta(false)
        setRichiesta(null)
      }
    }
    window.addEventListener('keydown', tasto)
    return () => window.removeEventListener('keydown', tasto)
  }, [richiesta])

  if (!richiesta) return null
  const pericolo = richiesta.pericolo ?? DISTRUTTIVA.test(richiesta.testo)

  return (
    <div
      className="conferma-sfondo fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center"
      onClick={() => chiudi(false)}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="conferma-testo"
        className="conferma-finestra w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center gap-3 px-6 pb-5 pt-6 text-center">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-full text-2xl ${
              pericolo ? 'bg-red-100 dark:bg-red-950' : 'bg-green-100 dark:bg-green-950'
            }`}
            aria-hidden
          >
            {pericolo ? '⚠️' : '⚽'}
          </div>
          <p id="conferma-testo" className="text-base font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
            {richiesta.testo}
          </p>
          {richiesta.dettaglio && <p className="text-sm text-zinc-500">{richiesta.dettaglio}</p>}
        </div>
        <div className="grid grid-cols-2 gap-2 border-t border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
          <button
            type="button"
            onClick={() => chiudi(false)}
            className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-100 active:scale-[0.98] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            {richiesta.annulla ?? t('Annulla')}
          </button>
          <button
            ref={okRef}
            type="button"
            onClick={() => chiudi(true)}
            className={`rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98] ${
              pericolo ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {richiesta.ok ?? (pericolo ? t('Sì, procedi') : t('Conferma'))}
          </button>
        </div>
      </div>
    </div>
  )
}
