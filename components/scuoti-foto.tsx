'use client'

import { useEffect, useState } from 'react'

const STRATTONE = 30 // variazione di accelerazione (m/s²) tra due letture per contare uno strattone
const STRATTONI = 3 // strattoni ravvicinati che fanno una "scossa"
const FINESTRA = 1000 // ms entro cui devono arrivare gli strattoni
const PAUSA = 2000 // ms dopo una scossa prima di riconoscerne un'altra

type ConPermesso = typeof DeviceMotionEvent & { requestPermission?: () => Promise<'granted' | 'denied'> }

// Scuotendo il telefono compare a tutto schermo una foto sorpresa della lega, a caso
// (mai la stessa due volte di fila); un tocco la chiude.
// Su iPhone i sensori di movimento vanno chiesti dopo un tocco: lo fa al primo tocco sulla pagina.
export function ScuotiFoto({ urls }: { urls: string[] }) {
  const [aperta, setAperta] = useState<string | null>(null)
  const chiave = urls.join(' ')

  useEffect(() => {
    const foto = chiave.split(' ')
    // le carica subito, così alla scossa compaiono senza attesa
    for (const u of foto) new Image().src = u
    let precedente = -1

    let ultima: { x: number; y: number; z: number } | null = null
    let strattoni: number[] = []
    let ferma = 0

    const movimento = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity
      if (a?.x == null || a.y == null || a.z == null) return
      const ora = Date.now()
      if (ultima && ora > ferma) {
        const delta = Math.abs(a.x - ultima.x) + Math.abs(a.y - ultima.y) + Math.abs(a.z - ultima.z)
        if (delta > STRATTONE) {
          strattoni = [...strattoni.filter((t) => ora - t < FINESTRA), ora]
          if (strattoni.length >= STRATTONI) {
            strattoni = []
            ferma = ora + PAUSA
            navigator.vibrate?.(150)
            let i = Math.floor(Math.random() * foto.length)
            if (foto.length > 1 && i === precedente) i = (i + 1) % foto.length
            precedente = i
            setAperta(foto[i])
          }
        }
      }
      ultima = { x: a.x, y: a.y, z: a.z }
    }

    const chiediPermesso = () => {
      ;(DeviceMotionEvent as ConPermesso).requestPermission?.().catch(() => undefined)
    }

    window.addEventListener('devicemotion', movimento)
    if (typeof DeviceMotionEvent !== 'undefined' && (DeviceMotionEvent as ConPermesso).requestPermission) {
      document.addEventListener('touchend', chiediPermesso, { once: true })
    }
    return () => {
      window.removeEventListener('devicemotion', movimento)
      document.removeEventListener('touchend', chiediPermesso)
    }
  }, [chiave])

  if (!aperta) return null
  return (
    <div
      role="dialog"
      aria-label="Foto sorpresa"
      onClick={() => setAperta(null)}
      className="fixed inset-0 z-[60] flex animate-[zoom_150ms_ease-out] items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- immagine dal CDN di Sanity */}
      <img src={aperta} alt="Foto sorpresa" className="max-h-[85vh] w-auto max-w-full rounded-3xl object-contain shadow-2xl ring-4 ring-white" />
      <span className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] text-sm text-white/70">Tocca per chiudere</span>
    </div>
  )
}
