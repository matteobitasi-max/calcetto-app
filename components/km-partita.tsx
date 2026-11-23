'use client'

import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { useEffect, useState, useTransition } from 'react'
import { collegaStrava, kmDaStrava, salvaKm, togliKm } from '@/app/actions'
import type { Distanza } from '@/lib/matches'
import { fetteSalute, metriPartita, avvisiNascosti, chiediConsensoKm, escludiPartita, impostaKmAutomatici, includiPartita, kmAutomatici, nascondiAvviso, nomeSalute, partiteEscluse, pochiKm, saluteDisponibile } from '@/lib/salute'
import { useT } from './lingua'

const DOPO_STRAVA = 'km-dopo-strava'

// da quale dato di Salute vengono i km (lo dice l'app per iPhone)
const DATI_SALUTE: Record<string, string> = { allenamento: 'allenamento dell’orologio', distanza: 'distanza camminata e corsa', passi: 'stima dai passi' }

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
  const [dettaglio, setDettaglio] = useState<Awaited<ReturnType<typeof fetteSalute>> | null>(null)
  const ora = (ms: number) => new Date(ms).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

  const conDato = (testo: string, fonte?: string) => (fonte && DATI_SALUTE[fonte] ? `${testo} · ${t(DATI_SALUTE[fonte])}` : testo)

  const salva = (metri: number) =>
    startTransition(async () => {
      setPochi(null)
      includiPartita(matchId)
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
    if (saluteDisponibile() && kmAutomatici() && !miei && fine <= Date.now() && !partiteEscluse().includes(matchId) && !avvisiNascosti().includes(matchId)) {
      metriPartita(inizio, fine)
        .then(({ metri }) => {
          if (metri >= 50 && pochiKm(metri, inizio, fine)) setPochi(metri)
        })
        .catch(() => undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo all'apertura della pagina
  }, [])

  const daSalute = async () => {
    if (!(await chiediConsensoKm(t('Per i km delle partite, The Cap legge da {app} solo i dati sul movimento registrati durante le tue partite: distanza camminata e corsa, passi e allenamenti. Sono dati legati alla salute: li usiamo solo per mostrare i tuoi km ai membri della lega e puoi disattivarlo quando vuoi in Il mio account. Acconsenti?', { app: nome })), t('Acconsento'))) return
    startTransition(async () => {
      try {
        const { metri, fonte } = await metriPartita(inizio, fine)
        // permesso chiesto: da ora i km delle partite si prendono da soli all'apertura dell'app
        impostaKmAutomatici(true)
        // presi a mano: anche se prima li avevo tolti, i km automatici possono di nuovo aggiornarli
        includiPartita(matchId)
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
        setMessaggio(r.error ? { testo: conDato(r.error, fonte), errore: true } : { testo: conDato(`✅ ${t('{km} km da {app}', { km: formatoKm(metri / 1000), app: nome })}`, fonte) })
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
                // nasconde solo l'avviso: se più tardi arrivano i dati dell'orologio, i km si prendono lo stesso
                nascondiAvviso(matchId)
                setPochi(null)
              }}
              className={`${pulsante} text-amber-900 underline dark:text-amber-200`}
            >
              {t('Lascia stare')}
            </button>
          </div>
        </div>
      )}

      {salute && (
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(async () => setDettaglio(await fetteSalute(inizio, fine).catch(() => null)))}
          className="text-xs text-zinc-500 underline"
        >
          🔍 {t('Perché questi km?')}
        </button>
      )}
      {dettaglio && (
        <div className="space-y-1 rounded-lg bg-zinc-50 p-3 font-mono text-[11px] leading-snug text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
          <p>
            {t('Partita')} {ora(inizio)}–{ora(fine)}: {formatoKm(dettaglio.totale / 1000)} km · {dettaglio.fonte ? t(DATI_SALUTE[dettaglio.fonte] ?? dettaglio.fonte) : '—'}
          </p>
          {dettaglio.grezzi?.allenamenti && (
            <p>
              {t('Allenamenti')}: {dettaglio.grezzi.allenamenti.map((a) => `${ora(a.inizio)}–${ora(a.fine)} ${formatoKm(a.metri / 1000)} km`).join(', ') || '—'}
            </p>
          )}
          {dettaglio.fette.map((f) => (
            <p key={f.da} className={f.da >= inizio && f.a <= fine ? '' : 'opacity-50'}>
              {ora(f.da)}–{ora(f.a)} · {formatoKm(f.metri / 1000)} km{f.fonte && f.metri > 0 ? ` · ${t(DATI_SALUTE[f.fonte] ?? f.fonte)}` : ''}
            </p>
          ))}
        </div>
      )}
      {pending && <p className="text-sm text-zinc-500">…</p>}
      {messaggio && <p className={`text-sm ${messaggio.errore ? 'text-red-600' : 'text-green-700 dark:text-green-400'}`}>{messaggio.testo}</p>}
    </div>
  )
}
