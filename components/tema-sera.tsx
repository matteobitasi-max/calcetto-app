'use client'

import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { useEffect } from 'react'
import { temaScuro } from '@/lib/tema'

// Tiene aggiornato il tema: al tramonto si passa da solo al campo di sera (e alle 7 di nuovo al giorno),
// e cambia subito se il telefono passa in modalità scura. Nell'app adatta anche la barra in alto
// (ora, batteria): testo chiaro sul tema scuro, scuro sul tema chiaro.
export function TemaSera() {
  useEffect(() => {
    const applica = () => {
      const scuro = temaScuro()
      document.documentElement.classList.toggle('dark', scuro)
      if (Capacitor.isNativePlatform()) StatusBar.setStyle({ style: scuro ? Style.Dark : Style.Light }).catch(() => undefined)
    }
    applica()
    const ogni = setInterval(applica, 5 * 60_000)
    const sistema = window.matchMedia('(prefers-color-scheme: dark)')
    sistema.addEventListener('change', applica)
    const primoPiano = () => document.visibilityState === 'visible' && applica()
    document.addEventListener('visibilitychange', primoPiano)
    return () => {
      clearInterval(ogni)
      sistema.removeEventListener('change', applica)
      document.removeEventListener('visibilitychange', primoPiano)
    }
  }, [])
  return null
}
