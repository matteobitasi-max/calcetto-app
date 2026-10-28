'use client'

import { Capacitor } from '@capacitor/core'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '@/components/lingua'

const STRATTONE = 22 // variazione di accelerazione (m/s²) tra due letture per contare uno strattone
const STRATTONI = 3 // strattoni ravvicinati che fanno una "scossa"
const FINESTRA = 1200 // ms entro cui devono arrivare gli strattoni
const PAUSA = 2000 // ms dopo una scossa prima di riconoscerne un'altra

// App Android: regole più severe (prima bastava un gesto brusco). Conta strattoni distinti, cioè picchi
// di almeno 1,3 g oltre la gravità, distanti almeno 150 ms: ne servono 4 in un secondo e mezzo.
const ANDROID = { soglia: 1.3, strattoni: 4, finestra: 1500, distanza: 150 }

type ConPermesso = typeof DeviceMotionEvent & { requestPermission?: () => Promise<'granted' | 'denied'> }

// Scuotendo il telefono compare a tutto schermo una foto sorpresa della lega, a caso
// (mai la stessa due volte di fila); un tocco la chiude.
// Nelle app per iPhone e Android la scossa la riconosce la parte nativa (MainViewController /
// MainActivity, con l'accelerometro) e la segnala con l'evento "scossa"; nel browser si usano i sensori,
// che su iPhone vanno chiesti dopo un tocco: lo fa al primo tocco sulla pagina.
export function ScuotiFoto({ urls }: { urls: string[] }) {
  const t = useT()
  const [aperta, setAperta] = useState<string | null>(null)
  const chiave = urls.join(' ')

  useEffect(() => {
    const foto = chiave.split(' ')
    const nativa = Capacitor.isNativePlatform()
    // le carica subito, così alla scossa compaiono senza attesa
    for (const u of foto) new Image().src = u
    let precedente = -1

    let ultima: { x: number; y: number; z: number } | null = null
    let strattoni: number[] = []
    let ferma = 0

    const mostra = () => {
      const ora = Date.now()
      if (ora < ferma) return
      ferma = ora + PAUSA
      if (!nativa) navigator.vibrate?.(150)
      let i = Math.floor(Math.random() * foto.length)
      if (foto.length > 1 && i === precedente) i = (i + 1) % foto.length
      precedente = i
      setAperta(foto[i])
    }

    // Android: la scossa la riconosce la pagina con le regole più severe; quella segnalata dall'app
    // (MainActivity, più sensibile nelle versioni installate) si usa solo se il sensore qui non risponde.
    const android = nativa && Capacitor.getPlatform() === 'android'
    let sensoreAttivo = false
    let picchi: number[] = []
    const movimentoAndroid = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity
      if (a?.x == null || a.y == null || a.z == null) return
      sensoreAttivo = true
      const ora = Date.now()
      if (ora < ferma) return
      const forza = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z) / 9.81
      if (Math.abs(forza - 1) <= ANDROID.soglia) return
      if (picchi.length && ora - picchi[picchi.length - 1] < ANDROID.distanza) return
      picchi = [...picchi.filter((t) => ora - t < ANDROID.finestra), ora]
      if (picchi.length >= ANDROID.strattoni) {
        picchi = []
        navigator.vibrate?.(150)
        mostra()
      }
    }
    const scossaNativa = () => {
      if (!android || !sensoreAttivo) mostra()
    }

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
            mostra()
          }
        }
      }
      ultima = { x: a.x, y: a.y, z: a.z }
    }

    const chiediPermesso = () => {
      ;(DeviceMotionEvent as ConPermesso).requestPermission?.().catch(() => undefined)
    }

    window.addEventListener('scossa', scossaNativa)
    if (!nativa) window.addEventListener('devicemotion', movimento)
    if (android) window.addEventListener('devicemotion', movimentoAndroid)
    if (!nativa && typeof DeviceMotionEvent !== 'undefined' && (DeviceMotionEvent as ConPermesso).requestPermission) {
      document.addEventListener('touchend', chiediPermesso, { once: true })
    }
    return () => {
      window.removeEventListener('scossa', scossaNativa)
      window.removeEventListener('devicemotion', movimento)
      window.removeEventListener('devicemotion', movimentoAndroid)
      document.removeEventListener('touchend', chiediPermesso)
    }
  }, [chiave])

  if (!aperta) return null
  // Direttamente nel body: dentro l'intestazione (che ha la sfocatura) "fixed" resterebbe
  // chiuso nell'intestazione invece di coprire tutto lo schermo.
  return createPortal(
    <div
      role="dialog"
      aria-label={t('Foto sorpresa')}
      onClick={() => setAperta(null)}
      className="fixed inset-0 z-[60] animate-[zoom_150ms_ease-out] bg-black"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- immagine dal CDN di Sanity */}
      <img src={aperta} alt={t('Foto sorpresa')} className="h-full w-full object-cover" />
      <span className="absolute inset-x-0 bottom-[max(1.5rem,env(safe-area-inset-bottom))] text-center text-sm text-white drop-shadow">{t('Tocca per chiudere')}</span>
    </div>,
    document.body,
  )
}
