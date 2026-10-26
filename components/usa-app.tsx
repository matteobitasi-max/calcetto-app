'use client'

import { Capacitor } from '@capacitor/core'
import { useClerk } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { useT } from '@/components/lingua'

// Browser del telefono (non l'app TheCap): lì l'app non si usa.
export const browserDelTelefono = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) && !Capacitor.isNativePlatform()

// L'invito ad aprire l'app TheCap, al posto dell'app o della pagina di accesso.
export function SchermataUsaApp() {
  const t = useT()
  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-5 bg-white p-6 text-center dark:bg-zinc-950">
      {/* eslint-disable-next-line @next/next/no-img-element -- logo statico */}
      <img src="/icon-512.png" alt="" width={96} height={96} className="rounded-[22%] shadow-lg" />
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{t('Usa l’app The Cap')}</h1>
        <p className="max-w-xs text-zinc-600 dark:text-zinc-400">
          {t('Dal browser del telefono The Cap non funziona bene: aprila dall’app, così ricevi le notifiche e resti collegato.')}
        </p>
      </div>
      <a href="thecap://" className="w-full max-w-xs rounded-xl bg-green-600 px-6 py-4 text-lg font-semibold text-white shadow hover:bg-green-700">
        {t('Apri l’app')}
      </a>
      <p className="max-w-xs text-sm text-zinc-500">
        {t('Non hai ancora l’app? Chiedi il link per scaricarla all’organizzatore della tua lega. Poi aprila e premi “Accedi”.')}
      </p>
    </div>
  )
}

// Nelle pagine dell'app: dal browser del telefono si esce subito (la sessione rimasta lì si
// chiude) e si finisce sulla pagina di accesso, che mostra l'invito ad aprire l'app.
// Dal computer il sito resta usabile.
export function UsaApp() {
  const [blocca, setBlocca] = useState(false)
  const { signOut } = useClerk()

  useEffect(() => {
    if (!browserDelTelefono()) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- dipende dal dispositivo: noto solo nel browser
    setBlocca(true)
    signOut({ redirectUrl: '/sign-in' }).catch(() => undefined)
  }, [signOut])

  return blocca ? <SchermataUsaApp /> : null
}
