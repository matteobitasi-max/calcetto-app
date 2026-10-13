'use client'

import { Capacitor } from '@capacitor/core'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

const BORDO = 30 // px dal bordo sinistro in cui deve iniziare il gesto
const SOGLIA = 80 // px di trascinamento per tornare indietro

// iPhone (app o sito aggiunto alla Home): trascinando il dito dal bordo sinistro verso
// destra si torna alla pagina precedente, con una freccia che segue il dito.
// Su Android il gesto "indietro" lo gestisce il sistema.
export function SwipeIndietro() {
  const router = useRouter()
  const [dx, setDx] = useState(0)
  const inizio = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const ios = Capacitor.getPlatform() === 'ios' || (/iPad|iPhone|iPod/.test(navigator.userAgent) && window.matchMedia('(display-mode: standalone)').matches)
    if (!ios) return

    const start = (e: TouchEvent) => {
      const t = e.touches[0]
      inizio.current = e.touches.length === 1 && t.clientX <= BORDO ? { x: t.clientX, y: t.clientY } : null
    }
    const move = (e: TouchEvent) => {
      if (!inizio.current) return
      const t = e.touches[0]
      const x = t.clientX - inizio.current.x
      const y = Math.abs(t.clientY - inizio.current.y)
      if (y > 60 && y > x) {
        // è uno scorrimento verticale: non è il gesto "indietro"
        inizio.current = null
        setDx(0)
        return
      }
      setDx(Math.max(0, x))
    }
    const end = (e: TouchEvent) => {
      if (!inizio.current) return
      const x = e.changedTouches[0].clientX - inizio.current.x
      inizio.current = null
      setDx(0)
      if (x >= SOGLIA && window.history.length > 1) router.back()
    }
    const annulla = () => {
      inizio.current = null
      setDx(0)
    }
    document.addEventListener('touchstart', start, { passive: true })
    document.addEventListener('touchmove', move, { passive: true })
    document.addEventListener('touchend', end)
    document.addEventListener('touchcancel', annulla)
    return () => {
      document.removeEventListener('touchstart', start)
      document.removeEventListener('touchmove', move)
      document.removeEventListener('touchend', end)
      document.removeEventListener('touchcancel', annulla)
    }
  }, [router])

  if (dx <= 4) return null
  const pronto = dx >= SOGLIA
  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed left-0 top-1/2 z-50 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-2xl font-bold shadow-lg transition-colors ${
        pronto ? 'bg-green-600 text-white' : 'bg-white text-zinc-500 dark:bg-zinc-800'
      }`}
      style={{ transform: `translate(${Math.min(dx, SOGLIA + 20) - 30}px, -50%)` }}
    >
      ‹
    </div>
  )
}
