'use client'

import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { useEffect, useState, useTransition } from 'react'
import { collegaStrava, kmDaStrava, salvaKm, togliKm } from '@/app/actions'
import type { Distanza } from '@/lib/matches'
import { Salute, escludiPartita, impostaKmAutomatici, saluteDisponibile } from '@/lib/salute'

const DOPO_STRAVA = 'km-dopo-strava'

const FONTI: Record<string, string> = { strava: 'da Strava', salute: 'da Apple Salute', manuale: 'inseriti a mano' }
const formatoKm = (km: number) => km.toLocaleString('it-IT', { maximumFractionDigits: 2 })

// "I tuoi km" nella partita finita: da Apple Salute (app per iPhone) o da Strava (se attivo).
// Dove nessuno dei due è disponibile e non ci sono km, non mostra niente.
export function KmPartita({
  matchId,
  miei,
  inizio,
  fine,
  stravaAttivo,
  stravaCollegato,
}: {
  matchId: string
  miei?: Distanza
  inizio: number
  fine: number
  stravaAttivo: boolean
  stravaCollegato: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [messaggio, setMessaggio] = useState<{ testo: string; errore?: boolean } | null>(null)
  const [salute, setSalute] = useState(false)

  const daStrava = () =>
    startTransition(async () => {
      const r = await kmDaStrava(matchId)
      if (r.daCollegare) return collega()
      setMessaggio(r.error ? { testo: r.error, errore: true } : { testo: `✅ ${formatoKm(r.km!)} km da “${r.attivita}”` })
    })

  const collega = () =>
    startTransition(async () => {
      const app = Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Browser')
      const url = await collegaStrava(app, window.location.pathname)
      // al ritorno si prendono subito i km di questa partita
      try {
        sessionStorage.setItem(DOPO_STRAVA, matchId)
      } catch {}
      if (app) await Browser.open({ url, presentationStyle: 'popover' })
      else window.location.assign(url)
    })

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- dipende dal dispositivo: noto solo nell'app
    setSalute(saluteDisponibile())
    let dopo: string | null = null
    try {
      dopo = sessionStorage.getItem(DOPO_STRAVA)
      sessionStorage.removeItem(DOPO_STRAVA)
    } catch {}
    if (dopo === matchId && stravaCollegato) daStrava()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo all'apertura della pagina
  }, [])

  const daSalute = () =>
    startTransition(async () => {
      try {
        const { metri } = await Salute.distanza({ inizio, fine })
        // permesso chiesto: da ora i km delle partite si prendono da soli all'apertura dell'app
        impostaKmAutomatici(true)
        if (metri < 50) {
          setMessaggio({
            testo: 'In Salute non ci sono km registrati durante la partita (controlla anche di aver dato il permesso in Salute → Condivisione).',
            errore: true,
          })
          return
        }
        const r = await salvaKm(matchId, metri / 1000, 'salute')
        setMessaggio(r.error ? { testo: r.error, errore: true } : { testo: `✅ ${formatoKm(metri / 1000)} km da Apple Salute` })
      } catch {
        setMessaggio({ testo: 'Non riesco a leggere Apple Salute.', errore: true })
      }
    })

  if (!miei && !salute && !stravaAttivo) return null

  const pulsante = 'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50'

  return (
    <div className="space-y-3">
      <h2 className="font-semibold">🏃 I tuoi km</h2>
      {miei ? (
        <p className="text-sm">
          <b className="text-2xl tabular-nums">{formatoKm(miei.km)}</b> km
          {miei.fonte && <span className="text-zinc-500"> · {FONTI[miei.fonte]}</span>}
          <button type="button" disabled={pending} onClick={() =>
              startTransition(async () => {
                // tolti a mano: i km automatici non li rimettono
                escludiPartita(matchId)
                await togliKm(matchId)
              })
            } className="ml-3 text-xs text-zinc-500 underline">
            togli
          </button>
        </p>
      ) : (
        <p className="text-sm text-zinc-500">Prendi i km che hai corso: compaiono nella partita e nella classifica.</p>
      )}

      <div className="flex flex-wrap gap-2">
        {salute && (
          <button type="button" disabled={pending} onClick={daSalute} className={`${pulsante} bg-rose-500 text-white hover:bg-rose-600`}>
            ❤️ {miei ? 'Aggiorna' : 'Prendi'} da Apple Salute
          </button>
        )}
        {stravaAttivo && (
          <button
            type="button"
            disabled={pending}
            onClick={stravaCollegato ? daStrava : collega}
            className={`${pulsante} bg-[#fc4c02] text-white hover:bg-[#e34402]`}
          >
            {stravaCollegato ? `${miei ? 'Aggiorna' : 'Prendi'} da Strava` : 'Collega Strava'}
          </button>
        )}
      </div>

      {pending && <p className="text-sm text-zinc-500">…</p>}
      {messaggio && <p className={`text-sm ${messaggio.errore ? 'text-red-600' : 'text-green-700 dark:text-green-400'}`}>{messaggio.testo}</p>}
    </div>
  )
}
