'use client'

import { Capacitor } from '@capacitor/core'
import { FirebaseMessaging } from '@capacitor-firebase/messaging'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { attivaNotificheNative } from '@/app/actions'

export const isAppNativa = () => Capacitor.isNativePlatform()

const piattaforma = () => (Capacitor.getPlatform() === 'ios' ? 'ios' : 'android')

// Chiede il token Firebase del telefono e lo salva sul mio account.
export async function registraTelefono() {
  const { token } = await FirebaseMessaging.getToken()
  if (token) await attivaNotificheNative(token, piattaforma(), navigator.userAgent)
  return !!token
}

type Avviso = { titolo: string; testo: string; url?: string }

// Solo nell'app iPhone/Android: tiene aggiornato il token e apre la pagina giusta
// quando si tocca una notifica. Su Android una notifica che arriva con l'app aperta non
// compare nella barra del telefono (su iPhone sì): la mostriamo noi, in alto nell'app.
export function NotificheNativeListener() {
  const router = useRouter()
  const [avviso, setAvviso] = useState<Avviso | null>(null)

  useEffect(() => {
    if (!avviso) return
    const via = setTimeout(() => setAvviso(null), 6000)
    return () => clearTimeout(via)
  }, [avviso])

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
      FirebaseMessaging.addListener('notificationReceived', ({ notification }) => {
        if (Capacitor.getPlatform() !== 'android') return
        setAvviso({
          titolo: notification.title ?? '',
          testo: notification.body ?? '',
          url: (notification.data as { url?: string } | undefined)?.url,
        })
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

  if (!avviso) return null
  return (
    <button
      type="button"
      onClick={() => {
        if (avviso.url?.startsWith('/')) router.push(avviso.url)
        setAvviso(null)
      }}
      className="fixed inset-x-3 top-[max(0.75rem,var(--safe-area-inset-top,env(safe-area-inset-top)))] z-[80] rounded-2xl bg-zinc-900/95 p-3 text-left text-white shadow-2xl"
    >
      <span className="block text-sm font-semibold">{avviso.titolo}</span>
      {avviso.testo && <span className="mt-0.5 block whitespace-pre-line text-sm text-white/80">{avviso.testo}</span>}
    </button>
  )
}
