'use client'

import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { SignIn } from '@clerk/nextjs'
import { useEffect, useState } from 'react'

// Nelle app con il plugin Browser l'accesso si fa in una finestra del browser sopra l'app
// (Google e Apple non lo permettono dentro l'app); le versioni vecchie usano ancora SignIn.
const accessoNelBrowser = () => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Browser')

export function AccessoNativo() {
  const [nativo, setNativo] = useState<boolean | null>(null)
  const [aperto, setAperto] = useState(false)

  // Di ritorno dal browser (?__clerk_ticket=...) serve SignIn, che con il codice fa entrare.
  useEffect(
    // eslint-disable-next-line react-hooks/set-state-in-effect -- dipende dal dispositivo: noto solo nel browser
    () => setNativo(accessoNelBrowser() && !new URLSearchParams(window.location.search).has('__clerk_ticket')),
    [],
  )

  if (nativo === null) return null
  if (!nativo) return <SignIn />

  const apri = async () => {
    setAperto(true)
    await Browser.open({ url: `${window.location.origin}/accesso-app`, presentationStyle: 'popover' })
  }

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-3 text-center">
      <button
        type="button"
        onClick={apri}
        className="w-full rounded-xl bg-green-600 px-6 py-4 text-lg font-semibold text-white shadow hover:bg-green-700"
      >
        Accedi
      </button>
      <p className="text-sm text-zinc-500">
        {aperto
          ? 'Completa l’accesso nella finestra che si è aperta: poi torni qui da solo.'
          : 'Con Google, Apple, email o telefono. Si apre una finestra sicura del browser.'}
      </p>
    </div>
  )
}

// Ritorno dal browser con thecap://accesso?ticket=...: chiude la finestra e fa entrare l'app.
export function RitornoAccesso() {
  useEffect(() => {
    if (!accessoNelBrowser()) return
    const listener = App.addListener('appUrlOpen', ({ url }) => {
      const link = new URL(url)
      if (link.protocol !== 'thecap:' || link.host !== 'accesso') return
      const ticket = link.searchParams.get('ticket')
      if (!ticket) return
      Browser.close().catch(() => undefined)
      // ricarica completa: la pagina di accesso riparte con il codice
      window.location.replace(`/sign-in?__clerk_ticket=${encodeURIComponent(ticket)}`)
    })
    return () => {
      listener.then((l) => l.remove())
    }
  }, [])
  return null
}
