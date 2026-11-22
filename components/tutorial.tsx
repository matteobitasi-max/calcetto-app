'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { buttonClass } from './ui-classes'
import { EtichettaClub } from './pill-scelta'
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

// ---------- parte allenatore (Club PRO) ----------

const ROSA_CLUB = [
  { n: 1, nome: 'Andrea', ruolo: 'por' },
  { n: 2, nome: 'Luca', ruolo: 'dif' },
  { n: 5, nome: 'Marco', ruolo: 'dif', fuori: '🚑' },
  { n: 6, nome: 'Paolo', ruolo: 'dif' },
  { n: 8, nome: 'Fede', ruolo: 'cen' },
  { n: 10, nome: 'Ste', ruolo: 'cen' },
  { n: 9, nome: 'Leo', ruolo: 'att' },
] as const

const DURATE_CONVOCATI = [2000, 4200, 1800, 2600] as const
function SceneConvocati({ t, tempo: { passo, ms } }: Demo) {
  const spuntati = passo === 1 ? Math.min(ROSA_CLUB.length, Math.floor(Math.max(0, ms - 300) / 550)) : passo > 1 ? ROSA_CLUB.length : 0
  return (
    <Telefono>
      {passo === 0 && (
        <div className="space-y-2 pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{t('Prossima partita')}</p>
          <Riquadro className="space-y-2">
            <p className="font-semibold">{t('gio 20 nov, 21:00')}</p>
            <p className="rounded-md bg-zinc-100 p-1.5 dark:bg-zinc-800">📋 {t('L’allenatore non ha ancora scelto i convocati')}</p>
            <Tocco attivo={ms > 900}>
              <Pulsante>{t('Scegli i convocati')}</Pulsante>
            </Tocco>
          </Riquadro>
        </div>
      )}
      {(passo === 1 || passo === 2) && (
        <>
          <p className="pt-3 text-sm font-bold">📋 {t('Scegli i convocati')}</p>
          {ROSA_CLUB.map((g, i) => {
            const fuori = 'fuori' in g
            const preso = !fuori && i < spuntati
            return (
              <div key={g.n} className={`flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-2 py-0.5 dark:border-zinc-800 dark:bg-zinc-900 ${fuori ? 'opacity-50' : ''}`}>
                <span className={`flex h-3.5 w-3.5 items-center justify-center rounded border text-[9px] text-white ${preso ? 'border-green-600 bg-green-600' : 'border-zinc-400'}`}>{preso ? '✓' : ''}</span>
                <span className="w-4 text-right font-semibold tabular-nums text-zinc-400">{g.n}</span>
                <span className="flex-1">{g.nome}</span>
                <span className="text-[10px] text-zinc-500">{fuori ? `${g.fuori} ${t('Infortunato')}` : g.ruolo}</span>
              </div>
            )
          })}
          <Tocco attivo={passo === 2 && ms > 500}>
            <Pulsante>{t('Conferma {n} convocati', { n: ROSA_CLUB.length - 1 })}</Pulsante>
          </Tocco>
        </>
      )}
      {passo === 3 && (
        <div className="space-y-2 pt-6">
          <div className="rounded-md bg-zinc-800 px-2 py-1.5 text-white dark:bg-zinc-700">
            <p className="font-semibold">📋 {t('Sei convocato!')}</p>
            <p className="text-[10px] opacity-80">{t('gio 20 nov, 21:00')}</p>
          </div>
          <Tocco attivo={ms > 1000}>
            <div className="rounded-lg bg-green-600 py-1.5 text-center font-semibold text-white">{t('Ci sono')} ✋</div>
          </Tocco>
          <p className="text-center text-[10px] text-zinc-500">{t('Marco è infortunato: non si può convocare.')}</p>
        </div>
      )}
    </Telefono>
  )
}

// mini campo per la formazione: righe di pallini dal portiere all'attacco
function MiniCampo({ linee, pieni }: { linee: number[]; pieni: number }) {
  let k = 0
  const righe = [1, ...linee]
  return (
    <div className="relative h-44 overflow-hidden rounded-lg bg-[repeating-linear-gradient(to_bottom,#2f8f46_0_12.5%,#2a8340_12.5%_25%)]">
      <div className="absolute inset-1.5 rounded border border-white/60" />
      <div className="absolute inset-x-1.5 top-1/2 border-t border-white/60" />
      {righe.map((n, r) => {
        const y = 88 - (r * 76) / (righe.length - 1)
        return Array.from({ length: n }, (_, c) => {
          const i = k++
          return (
            <span
              key={`${r}-${c}`}
              className={`absolute flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-[8px] font-bold transition ${
                i < pieni ? 'border-white bg-white text-zinc-900' : 'border-dashed border-white/80 text-white'
              }`}
              style={{ left: `${((c + 1) * 100) / (n + 1)}%`, top: `${y}%` }}
            >
              {i < pieni ? [1, 2, 5, 6, 3, 8, 4, 10, 7, 9, 11][i] : '+'}
            </span>
          )
        })
      })}
    </div>
  )
}

const DURATE_FORMAZIONE = [2600, 3600, 3000] as const
function SceneFormazioneClub({ t, tempo: { passo, ms } }: Demo) {
  const modulo = passo === 2 && ms > 1200 ? '3-5-2' : '4-4-2'
  const linee = modulo.split('-').map(Number)
  return (
    <Telefono>
      {passo === 0 && (
        <>
          <p className="pt-3 text-sm font-bold">⚙️ {t('Impostazioni lega')}</p>
          <Riquadro className="space-y-1.5">
            <p className="font-semibold">⚽ {t('Formato e modulo')}</p>
            <div className="grid grid-cols-2 gap-1.5">
              <Tocco attivo={ms > 600 && ms < 1500}>
                <div className="rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700">{t('Calcio a {n}', { n: 11 })}</div>
              </Tocco>
              <Tocco attivo={ms >= 1500}>
                <div className="rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700">4-4-2</div>
              </Tocco>
            </div>
          </Riquadro>
          <p className="text-[10px] text-zinc-500">{t('Il modulo preferito si usa in ogni nuova formazione; in ogni partita lo puoi cambiare.')}</p>
        </>
      )}
      {passo >= 1 && (
        <>
          <div className="flex items-center justify-between pt-3">
            <span className="rounded-md border border-zinc-300 px-2 py-0.5 font-semibold dark:border-zinc-700">{modulo}</span>
            <Tocco attivo={passo === 1 && ms < 900}>
              <span className="rounded-md border border-zinc-300 bg-white px-2 py-0.5 dark:border-zinc-700 dark:bg-zinc-900">✨ {t('Proponi formazione')}</span>
            </Tocco>
          </div>
          <MiniCampo linee={linee} pieni={passo === 1 ? Math.min(11, Math.floor(Math.max(0, ms - 900) / 220)) : 11} />
          <p className="text-[10px] text-zinc-500">🪑 {t('Panchina')}: 12 Ivo · 14 Max · 16 Sami</p>
        </>
      )}
    </Telefono>
  )
}

const DURATE_PAGELLE = [3600, 2600, 3200] as const
function ScenePagelle({ t, tempo: { passo, ms } }: Demo) {
  const voti = [7.5, 6.5, 8]
  return (
    <Telefono>
      {passo === 0 && (
        <>
          <p className="pt-3 text-sm font-bold">📝 {t('Pagelle')}</p>
          {['Andrea', 'Luca', 'Ste'].map((g, i) => (
            <Riquadro key={g} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{g}</span>
                <span className="rounded-md border border-zinc-300 px-2 tabular-nums dark:border-zinc-700">{ms > 500 + i * 700 ? t.numero(voti[i]) : '—'}</span>
              </div>
              {i === 2 && <p className="text-[10px] text-zinc-500">{scrivi(t('Ottimo pressing, migliora i passaggi'), ms, 2400)}</p>}
            </Riquadro>
          ))}
        </>
      )}
      {passo === 1 && (
        <div className="space-y-2 pt-6">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{t('Il tuo voto')}</p>
          <div className="rounded-lg bg-green-50 p-2 dark:bg-green-950">
            <p className="font-semibold">
              Ste · <span className="rounded bg-violet-600 px-1 text-white">8</span>
            </p>
            <p className="mt-1 text-zinc-600 dark:text-zinc-300">“{t('Ottimo pressing, migliora i passaggi')}”</p>
          </div>
          <p className="text-center text-[10px] text-zinc-500">{t('La nota la vedono solo il giocatore e gli organizzatori.')}</p>
        </div>
      )}
      {passo === 2 && (
        <>
          <p className="pt-3 text-sm font-bold">📊 {t('Statistiche')}</p>
          <Riquadro className="space-y-1">
            <p className="font-semibold">🏃 {t('Presenze agli allenamenti')}</p>
            {[
              ['Ste', 92],
              ['Andrea', 80],
              ['Luca', 64],
            ].map(([g, perc], i) => (
              <div key={g} className="grid grid-cols-[3rem_1fr_2rem] items-center gap-1.5">
                <span>{g}</span>
                <span className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                  <span className="block h-full rounded-full bg-green-600 transition-all duration-700" style={{ width: `${ms > 300 + i * 300 ? perc : 0}%` }} />
                </span>
                <span className="text-right tabular-nums text-zinc-500">{perc}%</span>
              </div>
            ))}
          </Riquadro>
          <Riquadro className="flex items-center justify-between">
            <span>📝 {t('Media pagelle')} · Ste</span>
            <span className="rounded bg-green-600 px-1.5 font-bold text-white">7,6</span>
          </Riquadro>
        </>
      )}
    </Telefono>
  )
}

// ---------- il tutorial ----------

type Scena = { titolo: string; pro?: boolean; parte?: 'amici' | 'club'; passi: string[]; demo?: { Vista: (p: Demo) => ReactNode; durate: readonly number[] } }
const SCENE: Scena[] = [
  {
    titolo: 'Benvenuto in The Cap!',
    passi: ['Come usi The Cap? Scegli la parte che ti interessa, oppure scorri per vederle tutte e due.'],
  },
  {
    titolo: 'Crea la tua lega',
    parte: 'amici',
    demo: { Vista: SceneLega, durate: DURATE_LEGA },
    passi: ['Tocca Crea una lega', 'Scrivi il nome (e la città per il meteo)', 'Tocca Crea la lega: sei l’organizzatore', 'Invita gli amici con il link su WhatsApp'],
  },
  {
    titolo: 'Dai i voti ai giocatori',
    parte: 'amici',
    demo: { Vista: SceneVoti, durate: DURATE_VOTI },
    passi: ['In Rosa tocca un giocatore e poi Modifica', 'Sposta i cursori delle caratteristiche (da 1 a 10)', 'Il voto si calcola da solo e serve a fare squadre equilibrate'],
  },
  {
    titolo: 'Crea una partita',
    parte: 'amici',
    demo: { Vista: ScenePartita, durate: DURATE_PARTITA },
    passi: ['Tocca + Nuova partita', 'Scegli Partita', 'Giorno, campo, numero di giocatori: puoi anche ripeterla ogni settimana', 'Le convocazioni si aprono da sole e a tutti arriva la notifica'],
  },
  {
    titolo: 'Crea un torneo',
    parte: 'amici',
    pro: true,
    demo: { Vista: SceneTorneo, durate: DURATE_TORNEO },
    passi: ['Tocca + Nuova partita e scegli Torneo', 'Nome, formato e numero di squadre', 'Tocca Bilancia: squadre equilibrate in un attimo', 'Calendario, classifica e tabellone si creano da soli'],
  },
  {
    titolo: 'Impostazioni lega',
    parte: 'amici',
    demo: { Vista: SceneImpostazioni, durate: DURATE_IMPOSTAZIONI },
    passi: [
      'Tocca il nome della lega in alto e poi Impostazioni lega',
      'Satispay: metti il tuo link e i giocatori pagano la quota con un tocco',
      'Città del campo: in ogni partita compare il meteo previsto',
      'Interviste: incolla una playlist YouTube e i video compaiono da soli nell’app',
    ],
  },
  {
    titolo: 'Convocati e indisponibili',
    parte: 'club',
    demo: { Vista: SceneConvocati, durate: DURATE_CONVOCATI },
    passi: [
      'Nella partita tocca Scegli i convocati',
      'Spunta chi vuoi: infortunati e squalificati non si possono scegliere',
      'Conferma: solo i convocati possono rispondere',
      'Ai convocati arriva la notifica e confermano con un tocco',
    ],
  },
  {
    titolo: 'Formazione con modulo',
    parte: 'club',
    demo: { Vista: SceneFormazioneClub, durate: DURATE_FORMAZIONE },
    passi: [
      'Nelle impostazioni scegli il formato (dal calcio a 5 all’11) e il modulo preferito',
      'Proponi formazione: i titolari arrivano da ruoli e caratteristiche',
      'Cambia modulo quando vuoi (4-4-2, 3-5-2…) e sposta i giocatori',
    ],
  },
  {
    titolo: 'Pagelle e statistiche',
    parte: 'club',
    demo: { Vista: ScenePagelle, durate: DURATE_PAGELLE },
    passi: [
      'A fine partita dai un voto e una nota a chi ha giocato',
      'Ogni giocatore vede il suo voto e la nota, solo per lui',
      'Nelle Statistiche: presenze agli allenamenti e media delle pagelle',
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

  const primaAmici = SCENE.findIndex((x) => x.parte === 'amici')
  const primaClub = SCENE.findIndex((x) => x.parte === 'club')
  return (
    <div
      // la parte allenatore è in blu, come l'app nelle leghe Club PRO
      className={`space-y-4 ${scena.parte === 'club' ? 'tema-club' : ''}`}
      onTouchStart={(e) => (tocco.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (tocco.current == null) return
        const dx = e.changedTouches[0].clientX - tocco.current
        tocco.current = null
        if (Math.abs(dx) > 60) vaiA(indice + (dx < 0 ? 1 : -1))
      }}
    >
      <div className="space-y-1.5 text-center">
        {scena.parte === 'amici' && (
          <span className="inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800 dark:bg-green-950 dark:text-green-300">👥 {t('Tra amici')}</span>
        )}
        {scena.parte === 'club' && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-800 dark:text-green-300">
            🧢 {t('Per l’allenatore')} <EtichettaClub />
          </span>
        )}
        <h1 className="text-xl font-bold">
          {t(scena.titolo)}
          {scena.pro && <span className="ml-2 rounded-full bg-amber-400 px-2 py-0.5 align-middle text-[10px] font-bold uppercase text-amber-950">Pro</span>}
        </h1>
      </div>

      {scena.demo ? (
        <ScenaAnimata key={indice} scena={scena} t={t} />
      ) : (
        <div className="space-y-4 py-4 text-center">
          <p className="text-6xl" aria-hidden>
            ⚽
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{t(scena.passi[0])}</p>
          {/* scelta della parte: amici o allenatore */}
          <div className="grid gap-2 text-left">
            <button type="button" onClick={() => vaiA(primaAmici)} className="flex items-center gap-3 rounded-xl border-2 border-zinc-200 bg-white p-3 hover:border-green-600 dark:border-zinc-700 dark:bg-zinc-900">
              <span className="text-2xl">👥</span>
              <span>
                <span className="block font-semibold">{t('Gioco con gli amici')}</span>
                <span className="block text-xs text-zinc-500">{t('Lega, voti, partite, tornei')}</span>
              </span>
            </button>
            <button type="button" onClick={() => vaiA(primaClub)} className="flex items-center gap-3 rounded-xl border-2 border-zinc-200 bg-white p-3 hover:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900">
              <span className="text-2xl">🧢</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-semibold">
                  {t('Alleno una squadra')} <EtichettaClub />
                </span>
                <span className="block text-xs text-zinc-500">{t('Convocati, indisponibili, formazione, pagelle')}</span>
              </span>
            </button>
          </div>
        </div>
      )}

      {/* pallini divisi per parte: benvenuto · amici · allenatore */}
      <div className="flex items-center justify-center gap-2">
        {SCENE.map((x, i) => (
          <span key={i} className={`flex items-center gap-2 ${i > 0 && x.parte !== SCENE[i - 1].parte ? 'ml-2' : ''}`}>
            <button
              type="button"
              onClick={() => vaiA(i)}
              aria-label={`${i + 1}/${SCENE.length}`}
              className={`h-2 rounded-full transition-all ${i === indice ? 'w-6 bg-green-600' : x.parte === 'club' ? 'w-2 bg-zinc-500' : 'w-2 bg-zinc-300 dark:bg-zinc-700'}`}
            />
          </span>
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
