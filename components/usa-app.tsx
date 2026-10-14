'use client'

import { Capacitor } from '@capacitor/core'
import { useClerk } from '@clerk/nextjs'
import { useEffect, useState } from 'react'

// Dal browser del telefono l'app non si usa: si chiede di aprire l'app TheCap
// (lì accesso, notifiche, fotocamera e scossa funzionano). Dal computer il sito resta usabile.
export function UsaApp() {
  const [blocca, setBlocca] = useState(false)
  const { signOut } = useClerk()

  useEffect(() => {
    const telefono = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- dipende dal dispositivo: noto solo nel browser
    setBlocca(telefono && !Capacitor.isNativePlatform())
  }, [])

  if (!blocca) return null
  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-5 bg-white p-6 text-center dark:bg-zinc-950">
      {/* eslint-disable-next-line @next/next/no-img-element -- logo statico */}
      <img src="/logo.png" alt="" width={96} height={96} className="rounded-full shadow-lg ring-4 ring-white" />
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Usa l&apos;app TheCap</h1>
        <p className="max-w-xs text-zinc-600 dark:text-zinc-400">
          Dal browser del telefono TheCap non funziona bene: aprila dall&apos;app, così ricevi le notifiche e resti collegato.
        </p>
      </div>
      <a href="thecap://" className="w-full max-w-xs rounded-xl bg-green-600 px-6 py-4 text-lg font-semibold text-white shadow hover:bg-green-700">
        Apri l&apos;app
      </a>
      <p className="max-w-xs text-sm text-zinc-500">
        Non hai ancora l&apos;app? Chiedi il link per scaricarla all&apos;organizzatore della tua lega. Poi aprila e premi <b>Accedi</b>.
      </p>
      <button type="button" onClick={() => signOut({ redirectUrl: '/sign-in' })} className="text-sm text-zinc-500 underline">
        Esci da questo browser
      </button>
    </div>
  )
}
