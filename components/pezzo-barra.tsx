'use client'

import { useEffect, useState } from 'react'

// Il pezzo guadagnato (viola) o perso (rosso) di una barra delle caratteristiche:
// toccandolo compare una nuvoletta con la differenza, che sparisce da sola.
export function PezzoBarra({ larghezza, su, testo }: { larghezza: number; su: boolean; testo: string }) {
  const [aperto, setAperto] = useState(false)
  useEffect(() => {
    if (!aperto) return
    const via = setTimeout(() => setAperto(false), 2500)
    return () => clearTimeout(via)
  }, [aperto])
  return (
    <button
      type="button"
      aria-label={testo}
      onClick={() => setAperto((x) => !x)}
      className={`relative block h-2 rounded-r after:absolute after:-inset-y-3 after:inset-x-0 after:content-[''] ${su ? 'bg-violet-500/45' : 'bg-red-500/35'}`}
      style={{ width: `${larghezza}%` }}
    >
      {aperto && (
        <span
          className={`absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-semibold text-white shadow ${su ? 'bg-violet-600' : 'bg-red-600'}`}
        >
          {testo}
        </span>
      )}
    </button>
  )
}
