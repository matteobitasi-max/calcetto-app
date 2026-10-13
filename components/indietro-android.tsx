'use client'

import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { sezioneAccanto } from './sezioni'

// App Android: il gesto/tasto "indietro" su una sezione del menu va alla sezione precedente
// (Rosa → Classifica → Calendario → Partite); nelle altre pagine torna alla pagina precedente.
// Da Partite, o senza pagine precedenti, l'app va in secondo piano, come le altre app.
export function IndietroAndroid() {
  const router = useRouter()
  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return
    const listener = App.addListener('backButton', ({ canGoBack }) => {
      const sezione = sezioneAccanto(window.location.pathname, -1)
      if (sezione) router.replace(sezione)
      else if (sezione === undefined && canGoBack) window.history.back()
      else App.minimizeApp()
    })
    return () => {
      listener.then((l) => l.remove())
    }
  }, [router])
  return null
}
