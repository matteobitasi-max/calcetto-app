'use client'

import { useEffect, useState } from 'react'

// Pagina Pro: barra in basso con "Passa a Pro", che compare dopo la testata
// e sparisce quando i prezzi sono sullo schermo (lì c'è già il pulsante per abbonarsi).
export function BarraPro({ testo, sotto }: { testo: string; sotto: string }) {
  const [visibile, setVisibile] = useState(false)

  useEffect(() => {
    const prezzi = document.getElementById('prezzi')
    if (!prezzi) return
    let prezziVisti = false
    const aggiorna = () => setVisibile(!prezziVisti && window.scrollY > 320)
    const osserva = new IntersectionObserver(([e]) => {
      prezziVisti = e.isIntersecting
      aggiorna()
    })
    osserva.observe(prezzi)
    window.addEventListener('scroll', aggiorna, { passive: true })
    return () => {
      osserva.disconnect()
      window.removeEventListener('scroll', aggiorna)
    }
  }, [])

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-20 px-4 pb-[max(0.75rem,var(--safe-area-inset-bottom,env(safe-area-inset-bottom)))] pt-3 transition duration-300 ${
        visibile ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0'
      }`}
    >
      <a
        href="#prezzi"
        className="mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl bg-zinc-900 px-4 py-3 text-white shadow-2xl ring-1 ring-white/10 dark:bg-zinc-800"
      >
        <span className="min-w-0">
          <span className="block text-sm font-bold">{testo}</span>
          <span className="block truncate text-xs text-zinc-300">{sotto}</span>
        </span>
        <span className="shrink-0 rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-zinc-900">→</span>
      </a>
    </div>
  )
}
