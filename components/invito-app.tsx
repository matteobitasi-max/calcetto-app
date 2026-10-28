'use client'

import { Capacitor } from '@capacitor/core'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { buttonClass } from './ui-classes'
import { useT } from './lingua'

export const APP_STORE = 'https://apps.apple.com/it/app/thecap/id6822204365'
export const GOOGLE_PLAY = 'https://play.google.com/store/apps/details?id=com.matteobitasi.thecap'

// L'invito da riprendere dopo l'accesso (nell'app l'accesso passa dal browser e torna alla home).
const IN_SOSPESO = 'invito-in-sospeso'

type Dispositivo = 'app' | 'iphone' | 'android' | 'computer'

// Chi apre un link d'invito senza aver fatto l'accesso: dal telefono scarica l'app e apre lì l'invito
// (thecap://invito/CODICE), dal computer si registra; nell'app fa l'accesso e poi torna all'invito.
export function InvitoSenzaAccesso({ percorso, codice }: { percorso: string; codice: string }) {
  const t = useT()
  const [dispositivo, setDispositivo] = useState<Dispositivo | null>(null)

  useEffect(() => {
    const ua = navigator.userAgent
    // eslint-disable-next-line react-hooks/set-state-in-effect -- dipende dal dispositivo: noto solo nel browser
    setDispositivo(Capacitor.isNativePlatform() ? 'app' : /iPhone|iPad|iPod/i.test(ua) ? 'iphone' : /Android/i.test(ua) ? 'android' : 'computer')
  }, [])

  if (!dispositivo) return null
  const ricorda = () => {
    try {
      localStorage.setItem(IN_SOSPESO, percorso)
    } catch {}
  }
  const conRitorno = (pagina: string) => `${pagina}?redirect_url=${encodeURIComponent(percorso)}`
  const negozi = (
    <div className="flex flex-col gap-2">
      {dispositivo !== 'android' && (
        <a href={APP_STORE} className={`${buttonClass(dispositivo === 'iphone' ? 'primary' : 'secondary')} w-full justify-center`}>
           {t('Scarica da App Store')}
        </a>
      )}
      {dispositivo !== 'iphone' && (
        <a href={GOOGLE_PLAY} className={`${buttonClass(dispositivo === 'android' ? 'primary' : 'secondary')} w-full justify-center`}>
          ▶ {t('Scarica da Google Play')}
        </a>
      )}
    </div>
  )

  if (dispositivo === 'app') {
    return (
      <div className="space-y-3">
        <p className="text-sm text-zinc-500">{t('Accedi o registrati: poi entri subito nella lega.')}</p>
        <Link href="/sign-in" onClick={ricorda} className={`${buttonClass('primary')} w-full justify-center`}>
          {t('Accedi o registrati')}
        </Link>
      </div>
    )
  }

  if (dispositivo === 'computer') {
    return (
      <div className="space-y-3">
        <Link href={conRitorno('/sign-up')} className={`${buttonClass('primary')} w-full justify-center`}>
          {t('Registrati ed entra')}
        </Link>
        <Link href={conRitorno('/sign-in')} className={`${buttonClass('secondary')} w-full justify-center`}>
          {t('Ho già un account: accedi')}
        </Link>
        <p className="pt-2 text-xs text-zinc-500">{t('The Cap si usa soprattutto dal telefono:')}</p>
        {negozi}
      </div>
    )
  }

  // telefono senza l'app: scaricarla, poi aprire l'invito nell'app
  return (
    <ol className="space-y-4 text-left">
      <li className="space-y-2">
        <p className="text-sm font-semibold">1. {t('Scarica l’app The Cap')}</p>
        {negozi}
      </li>
      <li className="space-y-2">
        <p className="text-sm font-semibold">2. {t('Apri l’invito nell’app')}</p>
        <a href={`thecap:/${percorso}`} className={`${buttonClass('secondary')} w-full justify-center`}>
          📲 {t('Apri nell’app')}
        </a>
        <p className="text-xs text-zinc-500">
          {t('Oppure apri l’app, fai l’accesso e in “Ho un invito” scrivi il codice:')}{' '}
          <b className="font-mono text-sm tracking-widest text-zinc-800 dark:text-zinc-200">{codice}</b>
        </p>
      </li>
    </ol>
  )
}

// Dopo l'accesso nell'app: se c'era un invito in sospeso, si torna lì.
export function RiprendiInvito() {
  const router = useRouter()
  useEffect(() => {
    let percorso: string | null = null
    try {
      percorso = localStorage.getItem(IN_SOSPESO)
      localStorage.removeItem(IN_SOSPESO)
    } catch {}
    if (percorso && /^\/invito(-torneo|-squadra)?\/[A-Za-z0-9]+$/.test(percorso)) router.replace(percorso)
  }, [router])
  return null
}
