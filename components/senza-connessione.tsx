'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { LOGO_OFFLINE } from '@/lib/logo-offline'
import { useT } from '@/components/lingua'

const aspetta = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Il server risponde? (un file piccolo, senza cache, con un limite di 8 secondi). Sulla rete mobile
// la prima richiesta può fallire mentre la connessione si sveglia: prima di dire di no si riprova.
let ultimoErrore = ''
async function raggiungibile(tentativi = 2) {
  for (let i = 0; i < tentativi; i++) {
    if (i) await aspetta(2000)
    const stop = new AbortController()
    const timer = setTimeout(() => stop.abort(), 8000)
    try {
      const r = await fetch(`/icon-192.png?ping=${Date.now()}`, { cache: 'no-store', signal: stop.signal })
      if (r.ok) return true
      ultimoErrore = `ping ${r.status}`
    } catch (e) {
      ultimoErrore = `ping ${stop.signal.aborted ? 'timeout 8s' : (e as Error)?.message || String(e)}`
    } finally {
      clearTimeout(timer)
    }
  }
  return false
}

// Una richiesta al nostro server (non a Clerk, YouTube, ecc., che possono fallire per conto loro).
const alNostroServer = (risorsa: RequestInfo | URL) => {
  try {
    const url = typeof risorsa === 'string' || risorsa instanceof URL ? new URL(risorsa, location.href) : new URL(risorsa.url)
    return url.origin === location.origin
  } catch {
    return false
  }
}

// Avviso "Nessuna connessione" mentre si usa l'app. Non si fida solo del telefono (che con un Wi-Fi
// senza internet o poco segnale dice "online"): compare anche se una richiesta al server fallisce,
// poi ricontrolla ogni 5 secondi e quando la connessione torna sparisce e aggiorna la pagina.
// Si ricontrolla anche quando l'app torna in primo piano. (Senza internet già all'apertura
// dell'app, la pagina è capacitor/www/offline.html.)
export function SenzaConnessione() {
  const t = useT()
  const router = useRouter()
  const [offline, setOffline] = useState(false)
  // perché è comparso l'avviso (piccolo, in fondo): per capire i problemi di connessione da uno screenshot
  const [motivo, setMotivo] = useState('')
  const offlineRef = useRef(false)

  useEffect(() => {
    let attesa: ReturnType<typeof setTimeout> | undefined

    const tornato = () => {
      clearTimeout(attesa)
      offlineRef.current = false
      setOffline(false)
      router.refresh()
    }
    const ricontrolla = async () => {
      clearTimeout(attesa)
      if (navigator.onLine && (await raggiungibile(1))) return tornato()
      attesa = setTimeout(ricontrolla, 5000)
    }
    const giu = (perche?: unknown) => {
      if (offlineRef.current) return
      setMotivo([typeof perche === 'string' ? perche : 'evento offline', `onLine=${navigator.onLine}`, ultimoErrore, location.host].filter(Boolean).join(' · '))
      offlineRef.current = true
      setOffline(true)
      attesa = setTimeout(ricontrolla, 5000)
    }
    let ultimaRichiesta = ''
    const verifica = async () => {
      if (!navigator.onLine) return giu('navigator offline')
      if (!(await raggiungibile())) giu(ultimaRichiesta || 'controllo')
    }

    // Le richieste al server che falliscono per la rete fanno comparire l'avviso.
    const fetchOriginale = window.fetch
    window.fetch = async (...argomenti) => {
      try {
        return await fetchOriginale(...argomenti)
      } catch (e) {
        if (!(e instanceof DOMException && e.name === 'AbortError') && alNostroServer(argomenti[0])) {
          const r = argomenti[0]
          ultimaRichiesta = `fetch ${(typeof r === 'string' ? r : r instanceof URL ? r.pathname : r.url).slice(0, 60)}: ${(e as Error)?.message ?? e}`
          verifica()
        }
        throw e
      }
    }

    // tornando nell'app la rete mobile può metterci un attimo: si controlla dopo un paio di secondi
    let primoPianoTimer: ReturnType<typeof setTimeout> | undefined
    const primoPiano = () => {
      clearTimeout(primoPianoTimer)
      if (document.visibilityState === 'visible') primoPianoTimer = setTimeout(verifica, 2000)
    }
    const online = () => offlineRef.current && ricontrolla()
    window.addEventListener('offline', giu)
    window.addEventListener('online', online)
    document.addEventListener('visibilitychange', primoPiano)
    if (!navigator.onLine) giu('navigator offline all’avvio')

    return () => {
      clearTimeout(attesa)
      clearTimeout(primoPianoTimer)
      window.fetch = fetchOriginale
      window.removeEventListener('offline', giu)
      window.removeEventListener('online', online)
      document.removeEventListener('visibilitychange', primoPiano)
    }
  }, [router])

  if (!offline) return null
  return (
    <div
      role="alert"
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-4 bg-white/95 p-6 text-center backdrop-blur-sm dark:bg-zinc-950/95"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- logo incorporato: si vede anche senza internet */}
      <img src={LOGO_OFFLINE} alt="" width={96} height={96} className="rounded-[22%] shadow-lg" />
      <p className="text-5xl">📡</p>
      <h1 className="text-2xl font-bold">{t('Nessuna connessione')}</h1>
      <p className="max-w-xs text-zinc-600 dark:text-zinc-400">
        {t('The Cap ha bisogno di internet. Controlla Wi‑Fi o dati mobili: appena torna la connessione si riparte da qui.')}
      </p>
      <button
        type="button"
        onClick={async () => {
          if (navigator.onLine && (await raggiungibile(1))) {
            offlineRef.current = false
            setOffline(false)
            router.refresh()
          }
        }}
        className="rounded-xl bg-green-600 px-8 py-3 font-semibold text-white shadow hover:bg-green-700"
      >
        {t('Riprova')}
      </button>
      {motivo && <p className="max-w-xs break-words text-[10px] text-zinc-400">{motivo}</p>}
    </div>
  )
}
