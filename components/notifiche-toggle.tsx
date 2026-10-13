'use client'

import { useEffect, useState } from 'react'
import { attivaNotifiche, disattivaNotifiche } from '@/app/actions'
import { buttonClass } from './ui-classes'

type Stato = 'caricamento' | 'non_supportate' | 'serve_home' | 'app_nativa' | 'bloccate' | 'attive' | 'spente'

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
}

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent)
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches
// Dentro l'app iPhone/Android (Capacitor) le notifiche del sito non esistono: serviranno quelle native.
const isAppNativa = () => !!(window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()

// "banner": compare solo se le notifiche non sono attive. "impostazione": sempre, con interruttore.
export function NotificheToggle({ variant }: { variant: 'banner' | 'impostazione' }) {
  const [stato, setStato] = useState<Stato>('caricamento')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    ;(async () => {
      if (isAppNativa()) return setStato('app_nativa')
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        // Su iPhone le notifiche web esistono solo per l'app aggiunta alla schermata Home.
        return setStato(isIOS() && !isStandalone() ? 'serve_home' : 'non_supportate')
      }
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
      if (Notification.permission === 'denied') return setStato('bloccate')
      setStato((await reg.pushManager.getSubscription()) ? 'attive' : 'spente')
    })().catch(() => setStato('non_supportate'))
  }, [])

  async function attiva() {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      })
      await attivaNotifiche(JSON.parse(JSON.stringify(sub)), navigator.userAgent)
      setStato('attive')
    } catch {
      setStato(Notification.permission === 'denied' ? 'bloccate' : 'spente')
    } finally {
      setBusy(false)
    }
  }

  async function disattiva() {
    setBusy(true)
    try {
      const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription()
      if (sub) {
        await disattivaNotifiche(sub.endpoint)
        await sub.unsubscribe()
      }
      setStato('spente')
    } finally {
      setBusy(false)
    }
  }

  if (variant === 'banner' && stato !== 'spente' && stato !== 'serve_home') return null
  if (variant === 'impostazione' && stato === 'caricamento') return null

  const box = 'flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 text-sm'
  switch (stato) {
    case 'spente':
      return (
        <div className={`${box} border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950`}>
          <span>🔔 Attiva le notifiche per sapere subito quando si aprono le convocazioni.</span>
          <button onClick={attiva} disabled={busy} className={buttonClass('primary')}>
            {busy ? '…' : 'Attiva notifiche'}
          </button>
        </div>
      )
    case 'attive':
      return (
        <div className={`${box} border-zinc-200 dark:border-zinc-800`}>
          <span>🔔 Notifiche attive su questo dispositivo</span>
          <button onClick={disattiva} disabled={busy} className={buttonClass('secondary')}>
            {busy ? '…' : 'Disattiva'}
          </button>
        </div>
      )
    case 'app_nativa':
      return (
        <div className={`${box} border-zinc-200 text-zinc-500 dark:border-zinc-800`}>
          🔔 Le notifiche nell&apos;app arrivano con il prossimo aggiornamento.
        </div>
      )
    case 'serve_home':
      return (
        <div className={`${box} border-zinc-200 dark:border-zinc-800`}>
          <span>
            🔔 Per ricevere le notifiche su iPhone: tocca <b>Condividi</b> ⎋ e poi <b>Aggiungi alla schermata Home</b>, quindi
            apri Calcetto da lì.
          </span>
        </div>
      )
    case 'bloccate':
      return (
        <div className={`${box} border-zinc-200 text-zinc-500 dark:border-zinc-800`}>
          🔕 Le notifiche sono bloccate: riattivale dalle impostazioni del browser per questo sito.
        </div>
      )
    case 'non_supportate':
      return <div className={`${box} border-zinc-200 text-zinc-500 dark:border-zinc-800`}>Questo browser non supporta le notifiche.</div>
    default:
      return null
  }
}
