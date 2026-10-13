'use client'

import { Capacitor } from '@capacitor/core'
import { FirebaseMessaging } from '@capacitor-firebase/messaging'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { attivaNotificheNative } from '@/app/actions'

export const isAppNativa = () => Capacitor.isNativePlatform()

const piattaforma = () => (Capacitor.getPlatform() === 'ios' ? 'ios' : 'android')

// Chiede il token Firebase del telefono e lo salva sul mio account.
export async function registraTelefono() {
  const { token } = await FirebaseMessaging.getToken()
  if (token) await attivaNotificheNative(token, piattaforma(), navigator.userAgent)
  return !!token
}

// Solo nell'app iPhone/Android: tiene aggiornato il token e apre la pagina giusta
// quando si tocca una notifica.
export function NotificheNativeListener() {
  const router = useRouter()

  useEffect(() => {
    if (!isAppNativa()) return
    const listeners = [
      FirebaseMessaging.addListener('tokenReceived', ({ token }) => {
        attivaNotificheNative(token, piattaforma(), navigator.userAgent).catch(() => {})
      }),
      FirebaseMessaging.addListener('notificationActionPerformed', ({ notification }) => {
        const url = (notification.data as { url?: string } | undefined)?.url
        if (url?.startsWith('/')) router.push(url)
      }),
    ]
    // Se il permesso c'è già, ricontrolla il token a ogni apertura (Firebase può rinnovarlo).
    FirebaseMessaging.checkPermissions()
      .then(({ receive }) => (receive === 'granted' ? registraTelefono() : undefined))
      .catch(() => {})
    return () => {
      listeners.forEach((l) => l.then((h) => h.remove()))
    }
  }, [router])

  return null
}
