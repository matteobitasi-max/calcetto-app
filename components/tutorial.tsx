'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { buttonClass } from './ui-classes'
import { useT } from './lingua'
import type { T } from '@/lib/i18n'

// Tutorial del primo accesso: per ogni funzione chiave un mini telefono che rifà da solo i passaggi
// veri dell'app (il dito tocca, i campi si scrivono), in loop. Sotto, i passaggi con quello in corso evidenziato.

type Tempo = { passo: number; ms: number }
type Demo = { t: T; tempo: Tempo }

// Il copione di una scena: quanto dura ogni passaggio (ms). Ricomincia da capo alla fine.
function useCopione(durate: readonly number[]): Tempo {
  const [tempo, setTempo] = useState<Tempo>({ passo: 0, ms: 0 })
  const rif = useRef({ passo: 0, inizio: 0 })
  useEffect(() => {
    rif.current = { passo: 0, inizio: Date.now() }
    const id = setInterval(() => {
      const r = rif.current
      let ms = Date.now() - r.inizio
      if (ms >= durate[r.passo]) {
        r.passo = (r.passo + 1) % durate.length
        r.inizio = Date.now()
        ms = 0
      }
      setTempo({ passo: r.passo, ms })
    }, 80)
    return () => clearInterval(id)
  }, [durate])
  return tempo
}

// Il testo che si scrive da solo, una lettera alla volta, a partire da `da` ms.
const scrivi = (testo: string, ms: number, da = 0) => testo.slice(0, Math.max(0, Math.floor((ms - da) / 70)))

// ---------- pezzi del finto telefono ----------

function Telefono({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto h-80 w-full max-w-64 overflow-hidden rounded-[2rem] border-[6px] border-zinc-800 bg-zinc-50 shadow-xl dark:border-zinc-600 dark:bg-zinc-950">
      <div className="mx-auto mt-1 h-1.5 w-14 rounded-full bg-zinc-800 dark:bg-zinc-600" />
      <div className="space-y-2 p-3 text-[11px] leading-snug">{children}</div>
    </div>
  )
}

// Un elemento che il dito tocca: si illumina e compare 👆.
function Tocco({ attivo, children, className = '' }: { attivo: boolean; children: ReactNode; className?: string }) {
  return (
    <div className={`relative transition ${attivo ? 'scale-95' : ''} ${className}`}>
      {children}
      {attivo && (
        <>
          <span className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-green-500 motion-safe:animate-pulse" />
          <span className="pointer-events-none absolute -bottom-3 right-2 text-2xl drop-shadow motion-safe:animate-bounce" aria-hidden>
            👆
          </span>
        </>
      )}
    </div>
  )
}

const Campo = ({ etichetta, valore, attivo }: { etichetta: string; valore: string; attivo?: boolean }) => (
  <div>
    <p className="mb-0.5 text-[10px] text-zinc-500">{etichetta}</p>
    <div className={`min-h-6 rounded-md border bg-white px-2 py-1 dark:bg-zinc-900 ${attivo ? 'border-green-600' : 'border-zinc-300 dark:border-zinc-700'}`}>
      {valore}
      {attivo && <span className="motion-safe:animate-pulse">|</span>}
    </div>
  </div>
)

const Pulsante = ({ children }: { children: ReactNode }) => (
  <div className="rounded-lg bg-green-600 py-1.5 text-center font-semibold text-white">{children}</div>
)

const Riquadro = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`rounded-lg border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900 ${className}`}>{children}</div>
)

// La finestra "Cosa vuoi organizzare?" del pulsante + Nuova partita.
function SceltaNuova({ t, tocca }: { t: T; tocca?: 'partita' | 'torneo' }) {
  return (
    <div className="space-y-2">
      <div className="mx-auto w-fit rounded-full bg-green-600 px-3 py-1 font-semibold text-white">+ {t('Nuova partita')}</div>
      <Riquadro className="space-y-1.5 shadow-lg">
        <p className="font-semibold">{t('Cosa vuoi organizzare?')}</p>
        <Tocco attivo={tocca === 'partita'}>
          <div className="rounded-md bg-zinc-100 p-1.5 dark:bg-zinc-800">
            ⚽ <b>{t('Partita')}</b>
            <span className="block text-[10px] text-zinc-500">{t('Singola o ricorrente, con le convocazioni')}</span>
          </div>
        </Tocco>
        <div className="rounded-md bg-zinc-100 p-1.5 dark:bg-zinc-800">
          🏃 <b>{t('Allenamento')}</b>
        </div>
        <Tocco attivo={tocca === 'torneo'}>
          <div className="rounded-md bg-zinc-100 p-1.5 dark:bg-zinc-800">
            🏆 <b>{t('Torneo')}</b>
            <span className="block text-[10px] text-zinc-500">{t('Squadre fisse, girone e classifica')}</span>
          </div>
        </Tocco>
      </Riquadro>
    </div>
  )
}

// ---------- le scene ----------

const DURATE_LEGA = [2400, 4200, 1800, 2800] as const
function SceneLega({ t, tempo: { passo, ms } }: Demo) {
  const nome = t('Calcetto del giovedì')
  return (
    <Telefono>
      {passo === 0 && (
        <>
          <p className="pt-4 text-center text-sm font-bold">{t('Ciao! 👋')}</p>
          <Tocco attivo={ms > 900}>
            <Riquadro>
              <b>➕ {t('Crea una lega')}</b>
              <span className="block text-[10px] text-zinc-500">{t('Diventi organizzatore: poi inviti gli altri con un link su WhatsApp.')}</span>
            </Riquadro>
          </Tocco>
          <Riquadro>
            <b>📨 {t('Ho un invito')}</b>
          </Riquadro>
        </>
      )}
      {(passo === 1 || passo === 2) && (
        <>
          <p className="pt-4 text-center text-sm font-bold">{t('Crea una lega')}</p>
          <Campo etichetta={t('Nome della lega')} valore={passo === 1 ? scrivi(nome, ms, 300) : nome} attivo={passo === 1 && ms < 300 + nome.length * 70} />
          <Campo etichetta={t('Città')} valore={passo === 1 ? scrivi('Milano', ms, 600 + nome.length * 70) : 'Milano'} attivo={passo === 1 && ms >= 300 + nome.length * 70} />
          <Tocco attivo={passo === 2 && ms > 500}>
            <Pulsante>{t('Crea la lega')}</Pulsante>
          </Tocco>
        </>
      )}
      {passo === 3 && (
        <div className="space-y-2 pt-6 text-center">
          <p className="text-3xl">🎉</p>
          <p className="text-sm font-bold">{t('“{lega}” è pronta!', { lega: nome })}</p>
          <p className="text-zinc-500">{t('Ora invita i tuoi amici: chi apre il link entra subito nella lega.')}</p>
          <Tocco attivo={ms > 1000}>
            <div className="rounded-lg bg-[#25D366] py-1.5 font-semibold text-white">{t('Invita su WhatsApp')}</div>
          </Tocco>
        </div>
      )}
    </Telefono>
  )
}

const GIOCATORI = ['Andrea', 'Luca', 'Marco', 'Paolo'] as const
const DURATE_VOTI = [2200, 4400, 2600] as const
function SceneVoti({ t, tempo: { passo, ms } }: Demo) {
  // i cursori si spostano uno dopo l'altro verso il valore finale
  const voti = [
    { k: 'Velocità', da: 5, a: 8 },
    { k: 'Tecnica', da: 5, a: 7 },
    { k: 'Cervello', da: 5, a: 6.5 },
    { k: 'Fiato', da: 5, a: 9 },
    { k: 'Difesa', da: 5, a: 6 },
  ]
  const valore = (i: number) => {
    if (passo === 2) return voti[i].a
    const p = Math.min(1, Math.max(0, (ms - 300 - i * 750) / 600))
    return voti[i].da + (voti[i].a - voti[i].da) * p
  }
  const media = voti.reduce((s, _, i) => s + valore(i), 0) / voti.length
  return (
    <Telefono>
      {passo === 0 && (
        <>
          <p className="pt-3 text-sm font-bold">{t('Rosa')}</p>
          {GIOCATORI.map((g) => (
            <Tocco key={g} attivo={g === 'Marco' && ms > 900}>
              <Riquadro className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold dark:bg-zinc-700">{g[0]}</span>
                {g}
              </Riquadro>
            </Tocco>
          ))}
        </>
      )}
      {passo >= 1 && (
        <>
          <p className="pt-3 text-sm font-bold">{t('Modifica giocatore')} · Marco</p>
          <p className="text-[10px] text-zinc-500">{t('Caratteristiche (1–10)')}</p>
          {voti.map((v, i) => {
            const x = valore(i)
            const muovo = passo === 1 && ms > 300 + i * 750 && ms < 900 + i * 750
            return (
              <div key={v.k} className="grid grid-cols-[4.5rem_1fr_1.5rem] items-center gap-1.5">
                <span>{t(v.k)}</span>
                <div className="relative h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700">
                  <div className="h-full rounded-full bg-green-600" style={{ width: `${((x - 1) / 9) * 100}%` }} />
                  <span
                    className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-green-600 bg-white ${muovo ? 'ring-4 ring-green-500/30' : ''}`}
                    style={{ left: `${((x - 1) / 9) * 100}%` }}
                  />
                  {muovo && (
                    <span className="absolute top-1 -translate-x-1/2 text-xl" style={{ left: `${((x - 1) / 9) * 100}%` }} aria-hidden>
                      👆
                    </span>
                  )}
                </div>
                <span className="text-right font-semibold tabular-nums">{t.numero(Math.round(x * 10) / 10)}</span>
              </div>
            )
          })}
          <div className={`mt-2 rounded-lg p-2 text-center transition ${passo === 2 ? 'bg-green-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
            {t('voto')} <b className="text-sm tabular-nums">{t.numero(Math.round(media * 10) / 10)}</b>
          </div>
        </>
      )}
    </Telefono>
  )
}

const DURATE_PARTITA = [1800, 2000, 4200, 3400] as const
function ScenePartita({ t, tempo: { passo, ms } }: Demo) {
  const campo = t('Centro sportivo…').replace('…', '')
  const iscritti = passo === 3 ? Math.min(10, Math.floor(ms / 250)) : 0
  return (
    <Telefono>
      {passo === 0 && (
        <div className="space-y-2 pt-3">
          <Tocco attivo={ms > 700} className="mx-auto w-fit">
            <div className="rounded-full bg-green-600 px-3 py-1 font-semibold text-white">+ {t('Nuova partita')}</div>
          </Tocco>
          <Riquadro className="text-center text-zinc-500">{t('Nessuna partita in programma.')}</Riquadro>
        </div>
      )}
      {passo === 1 && (
        <div className="pt-3">
          <SceltaNuova t={t} tocca={ms > 700 ? 'partita' : undefined} />
        </div>
      )}
      {passo === 2 && (
        <>
          <p className="pt-3 text-sm font-bold">{t('Nuova partita')}</p>
          <Campo etichetta={t('Data e ora della partita')} valore={ms > 400 ? t('gio 20 nov, 21:00') : ''} attivo={ms <= 400} />
          <Campo etichetta={t('Campo / luogo')} valore={scrivi(campo, ms, 700)} attivo={ms > 700 && ms < 700 + campo.length * 70} />
          <Campo etichetta={t('Giocatori in lista')} valore={ms > 2200 ? '10' : ''} />
          <div className="flex items-center justify-between">
            <span>{t('Ripeti partita e convocazioni')}</span>
            <span className={`flex h-4 w-7 items-center rounded-full p-0.5 transition ${ms > 2800 ? 'justify-end bg-green-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}>
              <span className="h-3 w-3 rounded-full bg-white" />
            </span>
          </div>
          <Tocco attivo={ms > 3500}>
            <Pulsante>{t('Crea partita')}</Pulsante>
          </Tocco>
        </>
      )}
      {passo === 3 && (
        <div className="space-y-2 pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{t('Prossima partita')}</p>
          <div className="rounded-lg bg-green-600 p-2 text-center text-white">
            <p className="text-[10px] uppercase opacity-80">{t('Convocazioni aperte · chiudono tra')}</p>
            <p className="text-lg font-bold tabular-nums">1g 23:59</p>
          </div>
          <Riquadro className="flex items-center justify-between">
            <span>
              ✅ {t('Ci sono')}
            </span>
            <b className="tabular-nums">{iscritti}/10</b>
          </Riquadro>
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: iscritti }, (_, i) => (
              <span key={i} className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-200 text-[9px] font-bold dark:bg-zinc-700">
                {'ALMPGFSTRD'[i]}
              </span>
            ))}
          </div>
          {iscritti >= 2 && <div className="rounded-md bg-zinc-800 px-2 py-1 text-white dark:bg-zinc-700">🔔 {t('Convocazioni aperte')}</div>}
        </div>
      )}
    </Telefono>
  )
}

const DURATE_TORNEO = [1800, 4200, 3600, 3000] as const
const FORMATI = ['Girone all’italiana', 'Eliminazione diretta', 'Gironi'] as const
function SceneTorneo({ t, tempo: { passo, ms } }: Demo) {
  const nome = t('Es. Torneo d’autunno').replace(/^[^ ]+ /, '')
  const formato = passo === 1 ? Math.min(2, Math.floor(Math.max(0, ms - 2200) / 700)) : 0
  const bilanciato = passo === 2 && ms > 1400
  const squadre = [
    ['Andrea', 'Luca', 'Ste'],
    ['Marco', 'Paolo', 'Fede'],
    ['Gianni', 'Toni', 'Dario'],
    ['Leo', 'Nico', 'Max'],
  ]
  return (
    <Telefono>
      {passo === 0 && (
        <div className="pt-3">
          <SceltaNuova t={t} tocca={ms > 700 ? 'torneo' : undefined} />
        </div>
      )}
      {passo === 1 && (
        <>
          <p className="pt-3 text-sm font-bold">{t('Nuovo torneo')}</p>
          <Campo etichetta={t('Nome del torneo')} valore={scrivi(nome, ms, 300)} attivo={ms > 300 && ms < 300 + nome.length * 70} />
          <div className="space-y-1">
            {FORMATI.map((f, i) => (
              <div key={f} className={`rounded-md border px-2 py-1 transition ${i === formato && ms > 1600 ? 'border-green-600 bg-green-50 font-semibold dark:bg-green-950' : 'border-zinc-200 dark:border-zinc-700'}`}>
                {t(f)}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <span>{t('Numero di squadre')}</span>
            <b className="rounded-md border border-zinc-300 px-2 dark:border-zinc-700">4</b>
          </div>
          <Tocco attivo={ms > 3500}>
            <Pulsante>{t('Crea torneo')}</Pulsante>
          </Tocco>
        </>
      )}
      {passo === 2 && (
        <>
          <div className="flex items-center justify-between pt-3">
            <p className="text-sm font-bold">{t('Squadre e giocatori')}</p>
            <Tocco attivo={ms > 600 && ms < 1600}>
              <span className="rounded-md border border-zinc-300 bg-white px-2 py-0.5 font-semibold dark:border-zinc-700 dark:bg-zinc-900">⚖️ {t('Bilancia')}</span>
            </Tocco>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {squadre.map((s, i) => (
              <Riquadro key={i} className={`transition ${bilanciato ? 'border-green-600' : ''}`}>
                <p className="font-semibold">{t('squadra {n}', { n: i + 1 })}</p>
                {bilanciato ? (
                  <>
                    <p className="text-[10px] text-zinc-500">{s.join(', ')}</p>
                    <p className="text-[10px] font-semibold text-green-700 dark:text-green-400">{t('forza media {n}', { n: t.numero([7.1, 7.0, 7.2, 7.1][i]) })}</p>
                  </>
                ) : (
                  <p className="text-[10px] text-zinc-400">{t('Nessun giocatore')}</p>
                )}
              </Riquadro>
            ))}
          </div>
        </>
      )}
      {passo === 3 && (
        <>
          <p className="pt-3 text-sm font-bold">🏆 {nome}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{t('Calendario')}</p>
          {[
            [1, 2],
            [3, 4],
            [1, 3],
            [2, 4],
          ].map(([a, b], i) => (
            <Riquadro key={i} className={`flex justify-between transition-opacity duration-500 ${ms > i * 450 ? 'opacity-100' : 'opacity-0'}`}>
              <span>{t('squadra {n}', { n: a })}</span>
              <span className="text-zinc-400">–</span>
              <span>{t('squadra {n}', { n: b })}</span>
            </Riquadro>
          ))}
        </>
      )}
    </Telefono>
  )
}

const DURATE_IMPOSTAZIONI = [2200, 3800, 3600, 4000] as const
function SceneImpostazioni({ t, tempo: { passo, ms } }: Demo) {
  const nome = t('Calcetto del giovedì')
  const satispay = 'https://web.satispay.com/…'
  const playlist = 'https://youtube.com/playlist…'
  return (
    <Telefono>
      {passo === 0 && (
        <div className="space-y-1.5 pt-2">
          <div className="mx-auto flex w-fit items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 font-semibold dark:bg-zinc-800">
            ⚽ {nome} <span className="text-zinc-400">▾</span>
          </div>
          {ms > 600 && (
            <Riquadro className="space-y-1 shadow-lg">
              <p className="rounded-md px-1.5 py-1 text-zinc-500">⚽ {nome}</p>
              <hr className="border-zinc-200 dark:border-zinc-800" />
              <Tocco attivo={ms > 1200}>
                <p className="rounded-md px-1.5 py-1 font-semibold">⚙️ {t('Impostazioni lega')}</p>
              </Tocco>
            </Riquadro>
          )}
        </div>
      )}
      {passo === 1 && (
        <>
          <p className="pt-3 font-semibold">💶 {t('Pagamenti con Satispay')}</p>
          <Campo etichetta={t('Link di pagamento')} valore={ms < 1800 ? scrivi(satispay, ms, 200) : satispay} attivo={ms < 1800} />
          {ms >= 1800 && (
            <Riquadro className="space-y-1.5">
              <p className="text-[10px] text-zinc-500">{t('Prossima partita')} · 5 €</p>
              <Tocco attivo={ms > 2600}>
                <div className="rounded-lg bg-[#F94C43] py-1.5 text-center font-semibold text-white">{t('Paga {quota} € con Satispay', { quota: 5 })}</div>
              </Tocco>
            </Riquadro>
          )}
        </>
      )}
      {passo === 2 && (
        <>
          <p className="pt-3 font-semibold">🌦️ {t('Meteo del campo')}</p>
          <Campo etichetta={t('Città (per il meteo delle partite)')} valore={scrivi('Milano', ms, 200)} attivo={ms < 800} />
          {ms >= 1300 && (
            <Riquadro className="space-y-1 text-center">
              <p className="text-[10px] text-zinc-500">{t('gio 20 nov, 21:00')}</p>
              <p className="text-2xl">🌤️</p>
              <p className="font-semibold">{t('{meteo}, {gradi}° previsti alle {ora}', { meteo: t('Poco nuvoloso'), gradi: 12, ora: '21:00' })}</p>
            </Riquadro>
          )}
        </>
      )}
      {passo === 3 && (
        <>
          <p className="pt-3 font-semibold">🎤 {t('Interviste')}</p>
          <Campo etichetta={t('Link della playlist')} valore={ms < 1700 ? scrivi(playlist, ms, 100) : playlist} attivo={ms < 1700} />
          <div className="grid grid-cols-2 gap-1.5">
            {['Marco', 'Luca'].map((g, i) => (
              <div
                key={g}
                className={`overflow-hidden rounded-lg border border-zinc-200 bg-white transition-opacity duration-500 dark:border-zinc-800 dark:bg-zinc-900 ${ms > 2000 + i * 500 ? 'opacity-100' : 'opacity-0'}`}
              >
                <div className="flex h-12 items-center justify-center bg-zinc-800 text-lg text-white">▶</div>
                <p className="truncate p-1 text-[10px] font-semibold">🎤 {g}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </Telefono>
  )
}

// ---------- il tutorial ----------

type Scena = { titolo: string; pro?: boolean; passi: string[]; demo?: { Vista: (p: Demo) => ReactNode; durate: readonly number[] } }
const SCENE: Scena[] = [
  {
    titolo: 'Benvenuto in The Cap!',
    passi: ['Ti mostriamo come organizzare il calcetto con i tuoi amici. Scorri o tocca Avanti.'],
  },
  {
    titolo: 'Crea la tua lega',
    demo: { Vista: SceneLega, durate: DURATE_LEGA },
    passi: ['Tocca Crea una lega', 'Scrivi il nome (e la città per il meteo)', 'Tocca Crea la lega: sei l’organizzatore', 'Invita gli amici con il link su WhatsApp'],
  },
  {
    titolo: 'Dai i voti ai giocatori',
    demo: { Vista: SceneVoti, durate: DURATE_VOTI },
    passi: ['In Rosa tocca un giocatore e poi Modifica', 'Sposta i cursori delle caratteristiche (da 1 a 10)', 'Il voto si calcola da solo e serve a fare squadre equilibrate'],
  },
  {
    titolo: 'Crea una partita',
    demo: { Vista: ScenePartita, durate: DURATE_PARTITA },
    passi: ['Tocca + Nuova partita', 'Scegli Partita', 'Giorno, campo, numero di giocatori: puoi anche ripeterla ogni settimana', 'Le convocazioni si aprono da sole e a tutti arriva la notifica'],
  },
  {
    titolo: 'Crea un torneo',
    pro: true,
    demo: { Vista: SceneTorneo, durate: DURATE_TORNEO },
    passi: ['Tocca + Nuova partita e scegli Torneo', 'Nome, formato e numero di squadre', 'Tocca Bilancia: squadre equilibrate in un attimo', 'Calendario, classifica e tabellone si creano da soli'],
  },
  {
    titolo: 'Impostazioni lega',
    demo: { Vista: SceneImpostazioni, durate: DURATE_IMPOSTAZIONI },
    passi: [
      'Tocca il nome della lega in alto e poi Impostazioni lega',
      'Satispay: metti il tuo link e i giocatori pagano la quota con un tocco',
      'Città del campo: in ogni partita compare il meteo previsto',
      'Interviste: incolla una playlist YouTube e i video compaiono da soli nell’app',
    ],
  },
]

export function Tutorial({ dopo }: { dopo: string }) {
  const t = useT()
  const router = useRouter()
  const [indice, setIndice] = useState(0)
  const tocco = useRef<number | null>(null)
  const scena = SCENE[indice]
  const ultima = indice === SCENE.length - 1
  const fine = () => router.replace(dopo)
  const vaiA = (i: number) => setIndice(Math.max(0, Math.min(SCENE.length - 1, i)))

  return (
    <div
      className="space-y-4"
      onTouchStart={(e) => (tocco.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (tocco.current == null) return
        const dx = e.changedTouches[0].clientX - tocco.current
        tocco.current = null
        if (Math.abs(dx) > 60) vaiA(indice + (dx < 0 ? 1 : -1))
      }}
    >
      <div className="text-center">
        <h1 className="text-xl font-bold">
          {t(scena.titolo)}
          {scena.pro && <span className="ml-2 rounded-full bg-amber-400 px-2 py-0.5 align-middle text-[10px] font-bold uppercase text-amber-950">Pro</span>}
        </h1>
      </div>

      {scena.demo ? (
        <ScenaAnimata key={indice} scena={scena} t={t} />
      ) : (
        <div className="space-y-4 py-6 text-center">
          <p className="text-7xl" aria-hidden>
            ⚽
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{t(scena.passi[0])}</p>
        </div>
      )}

      <div className="flex justify-center gap-2">
        {SCENE.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => vaiA(i)}
            aria-label={`${i + 1}/${SCENE.length}`}
            className={`h-2 rounded-full transition-all ${i === indice ? 'w-6 bg-green-600' : 'w-2 bg-zinc-300 dark:bg-zinc-700'}`}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={fine} className={`text-sm text-zinc-500 hover:underline ${ultima ? 'invisible' : ''}`}>
          {t('Salta')}
        </button>
        <button type="button" onClick={() => (ultima ? fine() : vaiA(indice + 1))} className={`${buttonClass('primary')} min-w-32 py-3`}>
          {ultima ? t('Iniziamo! ⚽') : t('Avanti')}
        </button>
      </div>
    </div>
  )
}

// La demo nel telefono e sotto i passaggi, con quello che la demo sta mostrando evidenziato (stesso cronometro).
function ScenaAnimata({ scena, t }: { scena: Scena; t: T }) {
  const tempo = useCopione(scena.demo!.durate)
  const Vista = scena.demo!.Vista
  return (
    <>
      <Vista t={t} tempo={tempo} />
      <ol className="min-h-36 space-y-1">
        {scena.passi.map((p, i) => (
          <li
            key={i}
            className={`flex gap-2 rounded-lg px-2 py-1 text-sm transition ${i === tempo.passo ? 'bg-green-50 font-semibold text-zinc-900 dark:bg-green-950 dark:text-white' : 'text-zinc-500'}`}
          >
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${i === tempo.passo ? 'bg-green-600 text-white' : 'bg-zinc-200 dark:bg-zinc-800'}`}>{i + 1}</span>
            {t(p)}
          </li>
        ))}
      </ol>
    </>
  )
}
