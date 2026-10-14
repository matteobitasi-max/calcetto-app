'use client'

import { createContext, useActionState, useRef, useState, type ComponentProps } from 'react'
import type { FormState } from '@/app/actions'

// Nomi leggibili dei campi, per dire cosa manca.
const ETICHETTE: Record<string, string> = {
  data: 'data e ora della partita',
  aperturaConvocazioni: 'inizio delle convocazioni',
  luogo: 'campo / luogo',
  durataMinuti: 'durata della partita',
  postiDisponibili: 'numero di giocatori',
  nome: 'nome',
  email: 'email',
  codice: 'codice invito',
  golA: 'gol squadra A',
  golB: 'gol squadra B',
  ora: 'ora',
  aperturaOra: 'ora di inizio convocazioni',
  aperturaGiorniPrima: 'giorni prima',
}

// L'esito dell'ultimo invio del modulo (per PillSalva: sparire solo se è andato bene).
export const EsitoModulo = createContext<FormState>(undefined)

// Form collegato a una Server Action che può restituire un messaggio d'errore.
// Se mancano campi obbligatori lo dice esplicitamente (su iPhone il browser non mostra avvisi).
export function ActionForm({
  action,
  children,
  ...props
}: Omit<ComponentProps<'form'>, 'action'> & { action: (prev: FormState, fd: FormData) => Promise<FormState> }) {
  const [state, formAction] = useActionState(action, undefined)
  const [mancanti, setMancanti] = useState<string[]>([])
  const raccolti = useRef<Set<string> | null>(null)
  const avviso = useRef<HTMLParagraphElement>(null)

  return (
    <form
      action={formAction}
      onSubmit={() => setMancanti([])}
      onInvalidCapture={(e) => {
        e.preventDefault() // niente fumetto del browser: mostriamo il nostro messaggio
        const campo = e.target as HTMLInputElement
        if (!raccolti.current) {
          raccolti.current = new Set()
          // Tutti gli eventi "invalid" arrivano insieme: si raccolgono e si mostrano una volta.
          setTimeout(() => {
            setMancanti([...raccolti.current!])
            raccolti.current = null
            avviso.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          })
        }
        raccolti.current.add(ETICHETTE[campo.name] ?? campo.name)
      }}
      {...props}
    >
      <EsitoModulo value={state}>{children}</EsitoModulo>
      {mancanti.length > 0 && (
        <p ref={avviso} role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          Manca: {mancanti.join(', ')}.
        </p>
      )}
      {state?.error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}
    </form>
  )
}
