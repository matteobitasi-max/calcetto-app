import Link from 'next/link'
import { Suspense, type ReactNode } from 'react'
import { getMemberships, getUtente, requirePlayer } from '@/lib/player'
import { percorsoCalendario } from '@/lib/calendario'
import { AggiungiCalendario } from '@/components/aggiungi-calendario'
import { allenamentoFinito, finestra, getMatchesBetween, isAllenamento, presenti, type Match, type Stato } from '@/lib/matches'
import { isoToRomeLocal } from '@/lib/dates'
import { getT } from '@/lib/lingua'
import { inizialiGiorni, type T } from '@/lib/i18n'
import { assicuraRicorrenze } from '@/lib/series'
import { Card, Loading } from '@/components/ui'
import { avatarUrl } from '@/lib/image'
import { FiltroLega } from './filtro-lega'
import { EtichettaLega } from '@/components/etichetta-lega'
import { RigaImpegno } from '@/components/riga-impegno'
import { NuovoNelGiorno } from '@/components/scelta-nuovo'

const DAY = 86_400_000

const COLORE: Record<Stato | 'non_ancora' | 'scaduta', string> = {
  non_ancora: 'bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100',
  aperta: 'bg-green-600 text-white',
  scaduta: 'bg-amber-500 text-white',
  chiusa: 'bg-blue-600 text-white',
  giocata: 'bg-zinc-400 text-white dark:bg-zinc-600',
  annullata: 'bg-red-100 text-red-700 line-through dark:bg-red-950 dark:text-red-300',
}

// Colore del giorno: segue la finestra vera delle convocazioni, come l'etichetta.
const coloreDi = (m: Match) => {
  // un allenamento finito ha il colore di una partita giocata
  if (allenamentoFinito(m)) return COLORE.giocata
  const f = m.stato === 'aperta' ? finestra(m) : null
  return COLORE[f === 'non_ancora' || f === 'scaduta' ? f : m.stato]
}

export default function CalendarioPage({ searchParams }: PageProps<'/calendario'>) {
  return (
    <Suspense fallback={<Loading />}>
      <Calendario searchParams={searchParams} />
    </Suspense>
  )
}

const pad = (n: number) => String(n).padStart(2, '0')

async function Calendario({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ mese, lega, giorno, importati }, io, mie, t, utente] = await Promise.all([searchParams, requirePlayer(), getMemberships(), getT(), getUtente()])
  // Le leghe di cui faccio parte: di default tutte, o quella scelta dalla tendina. Il super admin che sta
  // guardando da ospite una lega di cui non fa parte vede solo quella.
  const membri = io.ospite ? [io] : mie
  if (!membri.length) {
    return (
      <Card className="space-y-2 text-center text-sm text-zinc-500">
        <p>{t('Non fai parte di nessuna lega, quindi non ci sono partite da mostrare.')}</p>
        <Link href="/benvenuto" className="font-medium text-green-700 hover:underline dark:text-green-400">
          {t('Crea una lega o entra in una →')}
        </Link>
      </Card>
    )
  }
  const inVista = membri.filter((x) => (typeof lega === 'string' && membri.some((y) => y.lega._id === lega) ? x.lega._id === lega : true))
  const scelta = inVista.length === 1 && membri.length > 1 ? inVista[0].lega._id : 'tutte'
  // il segno di ogni lega (logo, nome, "Club"): la squadra del Club e la lega con gli amici si distinguono a colpo d'occhio
  const segno = new Map(
    membri.map((x) => [x.lega._id, <EtichettaLega key={x.lega._id} nome={x.lega.nome} logo={avatarUrl(x.lega.logo, 32)} club={!!x.lega.club && x.lega.tipo === 'squadra'} />]),
  )
  const organizzo = inVista.filter((x) => x.isAdmin)
  const piuLeghe = inVista.length > 1
  await Promise.all(inVista.map((x) => assicuraRicorrenze({ legaId: x.lega._id })))

  const oggi = isoToRomeLocal(new Date()).slice(0, 10)
  const [y, m] = (typeof mese === 'string' && /^\d{4}-\d{2}$/.test(mese) ? mese : oggi.slice(0, 7)).split('-').map(Number)
  const inizio = Date.UTC(y, m - 1, 1)
  const giorniNelMese = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const vuoti = (new Date(inizio).getUTCDay() + 6) % 7 // lunedì = prima colonna

  // Un giorno di margine per lato: il giorno "italiano" può cadere a cavallo del giorno UTC.
  const matches = await getMatchesBetween(
    inVista.map((x) => x.lega._id),
    new Date(inizio - DAY).toISOString(), new Date(Date.UTC(y, m, 1) + DAY).toISOString(),
  )
  const perGiorno = new Map<string, Match[]>()
  for (const match of matches) {
    const key = isoToRomeLocal(match.data).slice(0, 10)
    perGiorno.set(key, [...(perGiorno.get(key) ?? []), match])
  }
  const delMese = matches.filter((match) => isoToRomeLocal(match.data).startsWith(`${y}-${pad(m)}`))
  // i giorni già passati (quelli di oggi restano in vista)
  const passati = delMese.filter((match) => isoToRomeLocal(match.data).slice(0, 10) < oggi)
  const prossimi = delMese.filter((match) => !passati.includes(match))
  const riga = (match: Match) => (
    <RigaImpegno
      key={match._id}
      match={match}
      lega={piuLeghe ? segno.get(match.legaId) : undefined}
      quando={t.data(match.data, { weekday: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
      dettagli={`${match.luogo} · ${presenti(match).length}/${match.postiDisponibili}`}
      t={t}
    />
  )

  const prec = m === 1 ? `${y - 1}-12` : `${y}-${pad(m - 1)}`
  const succ = m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`
  const meseCorrente = `${y}-${pad(m)}`
  // I link del calendario tengono la lega scelta nella tendina.
  const url = (q: { mese?: string; giorno?: string }) =>
    `/calendario?mese=${q.mese ?? meseCorrente}${scelta === 'tutte' ? '' : `&lega=${scelta}`}${q.giorno ? `&giorno=${q.giorno}` : ''}`
  const giornoScelto = typeof giorno === 'string' && giorno.startsWith(`${meseCorrente}-`) && /^\d{4}-\d{2}-\d{2}$/.test(giorno) ? giorno : null
  const titolo = new Intl.DateTimeFormat(t.locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(inizio)

  return (
    <div className="space-y-4">
      {membri.length > 1 && (
        <FiltroLega
          leghe={membri.map((x) => ({ id: x.lega._id, nome: x.lega.nome, logo: avatarUrl(x.lega.logo, 64), organizzatore: !!x.isAdmin, club: !!x.lega.club && x.lega.tipo === 'squadra' }))}
          scelta={scelta}
          mese={meseCorrente}
        />
      )}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <Link href={url({ mese: prec })} className="rounded-lg px-3 py-1 text-lg hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label={t('Mese precedente')}>
            ‹
          </Link>
          <div className="flex items-center gap-1">
            <h1 className="text-lg font-bold capitalize">{titolo}</h1>
            {utente && !io.ospite && <AggiungiCalendario percorso={percorsoCalendario(utente.id, t.lingua)} />}
          </div>
          <Link href={url({ mese: succ })} className="rounded-lg px-3 py-1 text-lg hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label={t('Mese successivo')}>
            ›
          </Link>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-zinc-500">
          {inizialiGiorni(t.locale).map((g, i) => (
            <div key={i}>{g}</div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {Array.from({ length: vuoti }, (_, i) => (
            <div key={`v${i}`} />
          ))}
          {Array.from({ length: giorniNelMese }, (_, i) => {
            const giorno = i + 1
            const key = `${y}-${pad(m)}-${pad(giorno)}`
            const partite = perGiorno.get(key)
            const base = `flex aspect-square flex-col items-center justify-center rounded-lg text-sm tabular-nums ${
              key === oggi ? 'ring-2 ring-green-600' : ''
            } ${key === giornoScelto ? 'outline-2 outline-offset-2 outline-zinc-900 dark:outline-white' : ''}`
            // Toccando un giorno si vedono sotto le sue partite (e, per chi organizza, il pulsante per crearne una).
            const colore = partite
              ? `font-bold ${coloreDi(partite[0])}`
              : key < oggi
                ? 'text-zinc-400 dark:text-zinc-600'
                : 'text-zinc-700 hover:bg-green-50 hover:text-green-700 dark:text-zinc-300 dark:hover:bg-green-950'
            return (
              <Link key={key} href={url({ giorno: key })} scroll={false} className={`${base} ${colore}`} aria-current={key === giornoScelto ? 'date' : undefined}>
                {giorno}
                {/* P = partita, A = allenamento (una lettera per impegno, al massimo tre) */}
                {partite && (
                  <span className="text-[10px] font-semibold leading-none tracking-tight">
                    {partite.slice(0, 3).map((p) => (isAllenamento(p) ? t('A') : t('P'))).join('')}
                    {partite.length > 3 && '+'}
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-zinc-300" />{t('in programma')}</span>
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-green-600" />{t('convocazioni aperte')}</span>
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-blue-600" />{t('convocazioni chiuse')}</span>
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-zinc-400" />{t('giocata')}</span>
          <span>
            <b className="font-semibold text-zinc-700 dark:text-zinc-300">{t('P')}</b> {t('Partita').toLowerCase()} ·{' '}
            <b className="font-semibold text-zinc-700 dark:text-zinc-300">{t('A')}</b> {t('Allenamento').toLowerCase()}
          </span>
          <span>· {t('tocca un giorno per vederne le partite')}</span>
        </div>
      </Card>

      {typeof importati === 'string' && Number(importati) > 0 && (
        <p className="rounded-xl bg-green-50 p-3 text-sm font-medium text-green-800 dark:bg-green-950 dark:text-green-300">
          ✅ {t('{n} eventi importati: li trovi nel calendario.', { n: Number(importati) })}
        </p>
      )}

      {organizzo.length > 0 && (
        <Link
          href={`/calendario/importa${organizzo.length === 1 ? `?lega=${organizzo[0].lega._id}` : ''}`}
          className="flex items-center justify-between rounded-xl border border-dashed border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-700 hover:border-green-600 hover:text-green-700 dark:border-zinc-700 dark:text-zinc-300 dark:hover:text-green-400"
        >
          📥 {t('Importa da un altro calendario')}
          <span className="text-zinc-400">›</span>
        </Link>
      )}

      {giornoScelto && (
        <GiornoScelto
          giorno={giornoScelto}
          partite={perGiorno.get(giornoScelto) ?? []}
          segno={segno}
          organizzo={giornoScelto >= oggi ? organizzo.map((x) => ({ id: x.lega._id, nome: x.lega.nome })) : []}
          chiudi={url({})}
          t={t}
        />
      )}

      {/* gli impegni del mese: quelli già passati chiusi in una tendina, sotto quelli ancora da giocare */}
      {delMese.length === 0 ? (
        <Card className="p-0">
          <p className="p-4 text-sm text-zinc-500">{t('Nessuna partita in questo mese.')}</p>
        </Card>
      ) : (
        <>
          {passati.length > 0 && (
            <details className="group rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                {t('Impegni passati ({n})', { n: passati.length })}
                <span className="text-zinc-400 transition group-open:rotate-180" aria-hidden>
                  ▾
                </span>
              </summary>
              <div className="divide-y divide-zinc-200 border-t border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">{passati.map(riga)}</div>
            </details>
          )}
          {prossimi.length > 0 && <Card className="divide-y divide-zinc-200 p-0 dark:divide-zinc-800">{prossimi.map(riga)}</Card>}
        </>
      )}
    </div>
  )
}

// Le partite del giorno toccato, ognuna con la sua lega; chi organizza può crearne una in quel giorno.
function GiornoScelto({
  giorno,
  partite,
  segno,
  organizzo,
  chiudi,
  t,
}: {
  t: T
  giorno: string
  partite: Match[]
  segno: Map<string, ReactNode>
  organizzo: { id: string; nome: string }[]
  chiudi: string
}) {
  return (
    <Card className="divide-y divide-zinc-200 border-2 border-green-600 p-0 dark:divide-zinc-800">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <h2 className="font-bold capitalize">{t.data(`${giorno}T12:00:00Z`, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
        <Link href={chiudi} scroll={false} aria-label={t('Chiudi')} className="rounded-lg px-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
          ✕
        </Link>
      </div>
      {partite.length === 0 && <p className="px-4 py-3 text-sm text-zinc-500">{t('Nessuna partita in questo giorno.')}</p>}
      {partite.map((match) => (
        <RigaImpegno
          key={match._id}
          match={match}
          lega={segno.get(match.legaId)}
          quando={t.ora(match.data)}
          dettagli={`${match.luogo} · ${presenti(match).length}/${match.postiDisponibili}`}
          t={t}
        />
      ))}
      {organizzo.length > 0 && (
        <div className="px-4 py-3">
          <NuovoNelGiorno giorno={giorno} lega={organizzo.length === 1 ? organizzo[0].id : undefined} scegliLega={organizzo.length > 1} />
        </div>
      )}
    </Card>
  )
}
