'use client'

import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { useEffect } from 'react'

// App Android: il gesto/tasto "indietro" torna alla pagina precedente;
// dalla prima pagina l'app va in secondo piano, come le altre app.
export function IndietroAndroid() {
  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return
    const listener = App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) window.history.back()
      else App.minimizeApp()
    })
    return () => {
      listener.then((l) => l.remove())
    }
  }, [])
  return null
}
