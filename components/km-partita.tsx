'use client'

import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { useEffect, useState, useTransition } from 'react'
import { collegaStrava, kmDaStrava, salvaKm, togliKm } from '@/app/actions'
import type { Distanza } from '@/lib/matches'
import { Salute, chiediConsensoKm, escludiPartita, impostaKmAutomatici, kmAutomatici, nomeSalute, partiteEscluse, pochiKm, saluteDisponibile } from '@/lib/salute'
import { useT } from './lingua'

const DOPO_STRAVA = 'km-dopo-strava'

const FONTI: Record<string, string> = { strava: 'da Strava', salute: 'da Apple Health / Health Connect', manuale: 'inseriti a mano' }

// "I tuoi km" nella partita finita: da Apple Salute (iPhone) o Health Connect (Android), o da Strava (se attivo).
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
  const t = useT()
  const formatoKm = (km: number) => t.numero(km, { maximumFractionDigits: 2 })
  const [pending, startTransition] = useTransition()
  const [messaggio, setMessaggio] = useState<{ testo: string; errore?: boolean } | null>(null)
  const [salute, setSalute] = useState(false)
  const [nome, setNome] = useState('Apple Health')
  // metri letti da Salute ma troppo pochi per una partita: si chiede se inserirli comunque
  const [pochi, setPochi] = useState<number | null>(null)

  const salva = (metri: number) =>
    startTransition(async () => {
      setPochi(null)
      const r = await salvaKm(matchId, metri / 1000, 'salute')
      setMessaggio(r.error ? { testo: r.error, errore: true } : { testo: `✅ ${t('{km} km da {app}', { km: formatoKm(metri / 1000), app: nome })}` })
    })

  const daStrava = () =>
    startTransition(async () => {
      const r = await kmDaStrava(matchId)
      if (r.daCollegare) return collega()
      setMessaggio(r.error ? { testo: r.error, errore: true } : { testo: `✅ ${t('{km} km da “{attivita}”', { km: formatoKm(r.km!), attivita: r.attivita ?? '' })}` })
    })

  const collega = () =>
    startTransition(async () => {
      const app = Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Browser')
      const url = await collegaStrava(app, window.location.pathname)
      // al ritorno si prendono subito i km di questa partita
      try {
        sessionStorage.setItem(DOPO_STRAVA, matchId)
      } catch {}
      if (app) await Browser.open({ url, presentationStyle: 'fullscreen' })
      else window.location.assign(url)
    })

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- dipende dal dispositivo: noto solo nell'app
    setSalute(saluteDisponibile())
    setNome(nomeSalute())
    let dopo: string | null = null
    try {
      dopo = sessionStorage.getItem(DOPO_STRAVA)
      sessionStorage.removeItem(DOPO_STRAVA)
    } catch {}
    if (dopo === matchId && stravaCollegato) daStrava()
    // km automatici attivi ma niente salvato: se in Salute ci sono pochi km lo si fa notare
    if (saluteDisponibile() && kmAutomatici() && !miei && fine <= Date.now() && !partiteEscluse().includes(matchId)) {
      Salute.distanza({ inizio, fine })
        .then(({ metri }) => {
          if (metri >= 50 && pochiKm(metri, inizio, fine)) setPochi(metri)
        })
        .catch(() => undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo all'apertura della pagina
  }, [])

  const daSalute = () => {
    if (!chiediConsensoKm(t('Per i km delle partite, The Cap legge da {app} solo la distanza camminata e corsa registrata durante le tue partite. È un dato legato alla salute: lo usiamo solo per mostrare i tuoi km ai membri della lega e puoi disattivarlo quando vuoi in Il mio account. Acconsenti?', { app: nome }))) return
    startTransition(async () => {
      try {
        const { metri } = await Salute.distanza({ inizio, fine })
        // permesso chiesto: da ora i km delle partite si prendono da soli all'apertura dell'app
        impostaKmAutomatici(true)
        if (metri < 50) {
          setMessaggio({
            testo: t('In {app} non ci sono km registrati durante la partita (controlla anche di aver dato il permesso di leggere la distanza).', { app: nome }),
            errore: true,
          })
          return
        }
        if (pochiKm(metri, inizio, fine)) {
          setMessaggio(null)
          setPochi(metri)
          return
        }
        const r = await salvaKm(matchId, metri / 1000, 'salute')
        setMessaggio(r.error ? { testo: r.error, errore: true } : { testo: `✅ ${t('{km} km da {app}', { km: formatoKm(metri / 1000), app: nome })}` })
      } catch (e) {
        setMessaggio({ testo: (e as { message?: string })?.message || t('Non riesco a leggere {app}.', { app: nome }), errore: true })
      }
    })
  }

  if (!miei && !salute && !stravaAttivo) return null

  const pulsante = 'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50'

  return (
    <div className="space-y-3">
      <h2 className="font-semibold">🏃 {t('I tuoi km')}</h2>
      {miei ? (
        <p className="text-sm">
          <b className="text-2xl tabular-nums">{formatoKm(miei.km)}</b> km
          {miei.fonte && <span className="text-zinc-500"> · {t(FONTI[miei.fonte])}</span>}
          <button type="button" disabled={pending} onClick={() =>
              startTransition(async () => {
                // tolti a mano: i km automatici non li rimettono
                escludiPartita(matchId)
                await togliKm(matchId)
              })
            } className="ml-3 text-xs text-zinc-500 underline">
            {t('togli')}
          </button>
        </p>
      ) : (
        <p className="text-sm text-zinc-500">{t('Prendi i km che hai corso: compaiono nella partita e nella classifica.')}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {salute && (
          <button type="button" disabled={pending} onClick={daSalute} className={`${pulsante} bg-rose-500 text-white hover:bg-rose-600`}>
            ❤️ {t(miei ? 'Aggiorna da {app}' : 'Prendi da {app}', { app: nome })}
          </button>
        )}
        {stravaAttivo && (
          <button
            type="button"
            disabled={pending}
            onClick={stravaCollegato ? daStrava : collega}
            className={`${pulsante} bg-[#fc4c02] text-white hover:bg-[#e34402]`}
          >
            {stravaCollegato ? t(miei ? 'Aggiorna da {app}' : 'Prendi da {app}', { app: 'Strava' }) : t('Collega Strava')}
          </button>
        )}
      </div>

      {pochi != null && (
        <div className="space-y-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <p>
            🤔 {t('Sembra che non avessi nessun tracker addosso: in {app} ci sono solo {km} km durante la partita.', { app: nome, km: formatoKm(pochi / 1000) })}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pending} onClick={() => salva(pochi)} className={`${pulsante} bg-amber-600 text-white hover:bg-amber-700`}>
              {t('Inserisci comunque')}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                // non li si propone più per questa partita
                escludiPartita(matchId)
                setPochi(null)
              }}
              className={`${pulsante} text-amber-900 underline dark:text-amber-200`}
            >
              {t('Lascia stare')}
            </button>
          </div>
        </div>
      )}

      {pending && <p className="text-sm text-zinc-500">…</p>}
      {messaggio && <p className={`text-sm ${messaggio.errore ? 'text-red-600' : 'text-green-700 dark:text-green-400'}`}>{messaggio.testo}</p>}
    </div>
  )
}
