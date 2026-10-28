'use client'

import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { SignIn, SignUp } from '@clerk/nextjs'
import { SchedeAccesso } from './schede-accesso'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { SchermataUsaApp, browserDelTelefono } from './usa-app'
import { useT } from '@/components/lingua'

// Nelle app con il plugin Browser l'accesso si fa in una finestra del browser sopra l'app
// (Google e Apple non lo permettono dentro l'app); le versioni vecchie usano ancora SignIn.
const accessoNelBrowser = () => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Browser')

// La pagina di accesso: nell'app il pulsante "Accedi" (finestra del browser), dal browser del
// telefono l'invito ad aprire l'app, dal computer (o di ritorno con il codice) il login di Clerk.
export function AccessoNativo({ registrati = false }: { registrati?: boolean }) {
  const t = useT()
  const [modo, setModo] = useState<'app' | 'telefono' | 'clerk' | null>(null)
  const [aperto, setAperto] = useState(false)

  useEffect(() => {
    // Di ritorno dal browser (?__clerk_ticket=...) serve SignIn, che con il codice fa entrare.
    const ticket = new URLSearchParams(window.location.search).has('__clerk_ticket')
    // eslint-disable-next-line react-hooks/set-state-in-effect -- dipende dal dispositivo: noto solo nel browser
    setModo(ticket ? 'clerk' : accessoNelBrowser() ? 'app' : browserDelTelefono() ? 'telefono' : 'clerk')
  }, [])

  if (modo === null) return null
  if (modo === 'telefono') return <SchermataUsaApp />
  if (modo === 'clerk')
    return (
      <div className="flex w-full flex-col items-center gap-4">
        <SchedeAccesso attiva={registrati ? 'registrati' : 'accedi'} accedi="/sign-in" registrati="/sign-up" />
        {registrati ? <SignUp signInUrl="/sign-in" /> : <SignIn signUpUrl="/sign-up" />}
      </div>
    )

  const apri = async () => {
    setAperto(true)
    await Browser.open({ url: `${window.location.origin}/accesso-app`, presentationStyle: 'fullscreen' })
  }

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-3 text-center">
      <button
        type="button"
        onClick={apri}
        className="w-full rounded-xl bg-green-600 px-6 py-4 text-lg font-semibold text-white shadow hover:bg-green-700"
      >
        {t('Accedi')}
      </button>
      <p className="text-sm text-zinc-500">
        {aperto
          ? t('Completa l’accesso nella finestra che si è aperta: poi torni qui da solo.')
          : t('Con Google, Apple o email. Si apre una finestra sicura del browser.')}
      </p>
    </div>
  )
}

// Ritorno dal browser: thecap://accesso?ticket=... (chiude la finestra e fa entrare l'app)
// e thecap://strava (collegamento a Strava fatto).
export function RitornoAccesso() {
  const router = useRouter()
  useEffect(() => {
    if (!accessoNelBrowser()) return
    const listener = App.addListener('appUrlOpen', ({ url }) => {
      const link = new URL(url)
      if (link.protocol !== 'thecap:') return
      // ritorno da "Collega Strava": si ricarica la pagina di partenza (che poi prende i km)
      if (link.host === 'strava') {
        Browser.close().catch(() => undefined)
        const torna = link.searchParams.get('torna') ?? '/'
        window.location.replace(torna.startsWith('/') ? torna : '/')
        return
      }
      // link d'invito aperto nell'app (thecap://invito/CODICE, anche di tornei e squadre)
      if (['invito', 'invito-torneo', 'invito-squadra'].includes(link.host)) {
        const codice = link.pathname.replace(/^\//, '')
        if (/^[A-Za-z0-9]+$/.test(codice)) router.push(`/${link.host}/${codice}`)
        return
      }
      if (link.host !== 'accesso') return
      const ticket = link.searchParams.get('ticket')
      if (!ticket) return
      Browser.close().catch(() => undefined)
      // ricarica completa: la pagina di accesso riparte con il codice
      window.location.replace(`/sign-in?__clerk_ticket=${encodeURIComponent(ticket)}`)
    })
    return () => {
      listener.then((l) => l.remove())
    }
  }, [router])
  return null
}
