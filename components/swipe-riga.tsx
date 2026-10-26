'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { SubmitButton } from './submit-button'

// Larghezza dei pulsanti che compaiono sotto la riga.
const LARGHEZZA = 96
// Spostamento minimo del dito (px) prima di decidere se è uno swipe o uno scroll.
const SOGLIA = 10
// Quando una riga si apre, le altre si chiudono.
const EVENTO = 'swipe-riga-aperta'

export type AzioneSwipe = {
  /** Server Action eseguita toccando il pulsante. */
  azione: () => Promise<void>
  label: ReactNode
  confirm?: string
}

// Riga da trascinare col dito: verso sinistra mostra il pulsante rosso (`sinistra`, es. “Elimina”),
// verso destra quello verde (`destra`, es. “Convoca”). Lo scroll verticale della pagina resta libero;
// un tocco sulla riga aperta la richiude.
export function SwipeRiga({ children, sinistra, destra }: { children: ReactNode; sinistra?: AzioneSwipe; destra?: AzioneSwipe }) {
  const id = useId()
  const [dx, setDx] = useState(0)
  const [trascino, setTrascino] = useState(false)
  const gesto = useRef<{ x0: number; y0: number; base: number; verso: 'h' | 'v' | null } | null>(null)
  const appenaMosso = useRef(false)
  const aperto = dx !== 0

  useEffect(() => {
    const chiudi = (e: Event) => (e as CustomEvent<string>).detail !== id && setDx(0)
    window.addEventListener(EVENTO, chiudi)
    return () => window.removeEventListener(EVENTO, chiudi)
  }, [id])

  const fine = () => {
    const g = gesto.current
    gesto.current = null
    setTrascino(false)
    if (g?.verso !== 'h') return
    appenaMosso.current = true
    const fermo = dx < -LARGHEZZA / 2 ? -LARGHEZZA : dx > LARGHEZZA / 2 ? LARGHEZZA : 0
    setDx(fermo)
    if (fermo) window.dispatchEvent(new CustomEvent(EVENTO, { detail: id }))
  }

  const pulsante = (a: AzioneSwipe, lato: 'left' | 'right', colore: string, visibile: boolean) => (
    <form action={a.azione} className="absolute inset-y-0 flex" style={{ [lato]: 0, width: LARGHEZZA }} aria-hidden={!visibile}>
      <SubmitButton
        confirm={a.confirm}
        tabIndex={visibile ? 0 : -1}
        className={`flex w-full items-center justify-center px-2 text-sm font-semibold text-white ${colore}`}
      >
        {a.label}
      </SubmitButton>
    </form>
  )

  return (
    <div className="relative overflow-hidden rounded-lg">
      {sinistra && dx <= 0 && pulsante(sinistra, 'right', 'bg-red-600', dx < 0)}
      {destra && dx > 0 && pulsante(destra, 'left', 'bg-green-600', true)}
      <div
        className={`relative bg-white dark:bg-zinc-900 ${trascino ? '' : 'transition-transform duration-200'}`}
        style={{ transform: `translateX(${dx}px)`, touchAction: 'pan-y' }}
        onPointerDown={(e) => {
          appenaMosso.current = false
          gesto.current = { x0: e.clientX, y0: e.clientY, base: dx, verso: null }
        }}
        onPointerMove={(e) => {
          const g = gesto.current
          if (!g) return
          const mx = e.clientX - g.x0
          const my = e.clientY - g.y0
          if (!g.verso) {
            if (Math.abs(mx) < SOGLIA && Math.abs(my) < SOGLIA) return
            g.verso = Math.abs(mx) > Math.abs(my) ? 'h' : 'v'
            if (g.verso === 'h') {
              e.currentTarget.setPointerCapture(e.pointerId)
              setTrascino(true)
            }
          }
          if (g.verso === 'h') {
            const min = sinistra ? -LARGHEZZA * 1.4 : 0
            const max = destra ? LARGHEZZA * 1.4 : 0
            setDx(Math.max(min, Math.min(max, g.base + mx)))
          }
        }}
        // col mouse, trascinare il link della riga non deve partire come drag del browser
        onDragStart={(e) => e.preventDefault()}
        onPointerUp={fine}
        onPointerCancel={fine}
        // dopo uno swipe, o con la riga aperta, il tocco non apre il link della riga
        onClickCapture={(e) => {
          if (appenaMosso.current || aperto) {
            e.preventDefault()
            e.stopPropagation()
            appenaMosso.current = false
            if (!gesto.current) setDx(0)
          }
        }}
      >
        {children}
      </div>
    </div>
  )
}
