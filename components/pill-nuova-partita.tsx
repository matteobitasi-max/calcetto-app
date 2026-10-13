'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

// "+ Nuova partita" fissa in basso a destra: si nasconde scorrendo verso il basso
// e ricompare appena si torna su.
export function PillNuovaPartita() {
  const [visibile, setVisibile] = useState(true)
  const ultimo = useRef(0)

  useEffect(() => {
    ultimo.current = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      if (Math.abs(y - ultimo.current) < 8) return // ignora i piccoli tremolii
      setVisibile(y < ultimo.current || y < 40)
      ultimo.current = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <Link
      href="/partite/nuova"
      aria-hidden={!visibile}
      tabIndex={visibile ? 0 : -1}
      className={`fixed right-4 z-20 inline-flex items-center gap-1.5 rounded-full bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-green-900/20 transition-all duration-300 hover:bg-green-700 bottom-[max(1.25rem,calc(var(--safe-area-inset-bottom,env(safe-area-inset-bottom))_+_0.75rem))] ${
        visibile ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-24 opacity-0'
      }`}
    >
      <span className="text-lg leading-none">+</span> Nuova partita
    </Link>
  )
}
