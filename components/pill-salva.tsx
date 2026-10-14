'use client'

import { useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'

// Pillola "Salva" fissa in basso a destra (come "+ Nuova partita"): compare appena si
// cambia qualcosa nel modulo che la contiene, e resta finché il salvataggio è in corso.
export function PillSalva({ label = 'Salva' }: { label?: string }) {
  const segnaposto = useRef<HTMLSpanElement>(null)
  const [modificato, setModificato] = useState(false)
  const { pending } = useFormStatus()

  useEffect(() => {
    const form = segnaposto.current?.closest('form')
    if (!form) return
    const segna = () => setModificato(true)
    form.addEventListener('input', segna)
    form.addEventListener('change', segna)
    return () => {
      form.removeEventListener('input', segna)
      form.removeEventListener('change', segna)
    }
  }, [])

  const visibile = modificato || pending
  return (
    <>
      <span ref={segnaposto} hidden />
      <button
        type="submit"
        disabled={pending}
        aria-hidden={!visibile}
        tabIndex={visibile ? 0 : -1}
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
