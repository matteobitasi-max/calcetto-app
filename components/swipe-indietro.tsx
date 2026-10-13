'use client'

import { Capacitor } from '@capacitor/core'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { sezioneAccanto } from './sezioni'

const BORDO = 30 // px dal bordo in cui deve iniziare il gesto
const SOGLIA = 80 // px di trascinamento per cambiare pagina

// iPhone (app o sito aggiunto alla Home): trascinando il dito dal bordo sinistro verso destra
// si va alla sezione precedente del menu (Rosa → Classifica → Calendario → Partite), oppure,
// fuori dalle sezioni, alla pagina precedente. Dal bordo destro verso sinistra si va alla
// sezione successiva. Una freccia segue il dito. Su Android lo gestisce IndietroAndroid.
export function SwipeIndietro() {
  const router = useRouter()
  const [gesto, setGesto] = useState<{ verso: -1 | 1; dx: number } | null>(null)
  const inizio = useRef<{ x: number; y: number; verso: -1 | 1 } | null>(null)

  useEffect(() => {
    const ios = Capacitor.getPlatform() === 'ios' || (/iPad|iPhone|iPod/.test(navigator.userAgent) && window.matchMedia('(display-mode: standalone)').matches)
    if (!ios) return

    // dove porta il gesto: undefined = da qui non si va da nessuna parte
    const destinazione = (verso: -1 | 1): string | 'indietro' | undefined => {
      const sezione = sezioneAccanto(window.location.pathname, verso)
      if (sezione) return sezione
      if (sezione === undefined && verso === -1 && window.history.length > 1) return 'indietro'
      return undefined
    }

    const start = (e: TouchEvent) => {
      inizio.current = null
      if (e.touches.length !== 1 || document.querySelector('dialog[open]')) return
      const t = e.touches[0]
      const verso = t.clientX <= BORDO ? -1 : t.clientX >= window.innerWidth - BORDO ? 1 : null
      if (verso && destinazione(verso)) inizio.current = { x: t.clientX, y: t.clientY, verso }
    }
    const move = (e: TouchEvent) => {
      const i = inizio.current
      if (!i) return
      const t = e.touches[0]
      const dx = (t.clientX - i.x) * -i.verso // quanto il dito si è allontanato dal bordo
      const dy = Math.abs(t.clientY - i.y)
      if (dy > 60 && dy > dx) {
        // è uno scorrimento verticale: non è il gesto
        inizio.current = null
        setGesto(null)
        return
      }
      setGesto({ verso: i.verso, dx: Math.max(0, dx) })
    }
    const end = (e: TouchEvent) => {
      const i = inizio.current
      if (!i) return
      inizio.current = null
      setGesto(null)
      if ((e.changedTouches[0].clientX - i.x) * -i.verso < SOGLIA) return
      const dove = destinazione(i.verso)
      if (dove === 'indietro') router.back()
      else if (dove) router.replace(dove)
    }
    const annulla = () => {
      inizio.current = null
      setGesto(null)
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

  if (!gesto || gesto.dx <= 4) return null
  const pronto = gesto.dx >= SOGLIA
  const spostamento = Math.min(gesto.dx, SOGLIA + 20) - 30
  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed top-1/2 z-50 flex h-11 w-11 items-center justify-center rounded-full text-2xl font-bold shadow-lg transition-colors ${
        gesto.verso === -1 ? 'left-0' : 'right-0'
      } ${pronto ? 'bg-green-600 text-white' : 'bg-white text-zinc-500 dark:bg-zinc-800'}`}
      style={{ transform: `translate(${gesto.verso === -1 ? spostamento : -spostamento}px, -50%)` }}
    >
      {gesto.verso === -1 ? '‹' : '›'}
    </div>
  )
}
