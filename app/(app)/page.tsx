import Link from 'next/link'
import { Suspense, type ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getCurrentPlayer, type Player } from '@/lib/player'
import { finestra, formatoInCorso, getPastMatches, getUpcomingMatches, ordinati, presenti, type Match } from '@/lib/matches'
import { formatData, giornoPartita, oraPartita } from '@/lib/dates'
import { assicuraRicorrenze } from '@/lib/series'
import { Card, Loading, StatoBadge } from '@/components/ui'
import { PillNuovaPartita } from '@/components/pill-nuova-partita'
import { ScriviSquadra } from '@/components/scrivi-squadra'
import { Countdown } from '@/components/countdown'
import { NotificheToggle } from '@/components/notifiche-toggle'
import { RispostaButtons } from './partite/risposta-buttons'
import { Tabellino } from './partite/tabellino'
import { MeteoPartita } from '@/components/meteo-partita'

export default function Home() {
  return (
    <Suspense fallback={<Loading />}>
      <Partite />
    </Suspense>
  )
}

const breve = { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' } as const

async function Partite() {
  const player = await getCurrentPlayer()
  // Nessuna lega: si sceglie se crearne una o entrare con un invito.
  if (!player) redirect('/benvenuto')

  const legaId = player.lega._id
  await assicuraRicorrenze({ legaId })
  const [upcoming, past] = await Promise.all([getUpcomingMatches(legaId), getPastMatches(legaId, 100)])

  const [prossima, ...altreInProgramma] = upcoming
  const ultima = past.find((m) => m.stato === 'giocata' && m.risultato?.golA != null)
  const concluse = past.filter((m) => m !== ultima)

  return (
    <div className="space-y-6 pb-16">
      <NotificheToggle variant="banner" />

      {player.isAdmin && <PillNuovaPartita />}
      {(player.isAdmin || player.badge === 'capitano') && <ScriviSquadra />}

      {/* In alto: la prossima partita con il conto alla rovescia delle convocazioni */}
      {prossima ? (
        <ProssimaPartita match={prossima} player={player} citta={player.lega.citta} lega={player.lega.nome} />
      ) : (
        <Card className="text-center text-sm text-zinc-500">Nessuna partita in programma.</Card>
      )}

      {altreInProgramma.length > 0 && (
        <Tendina titolo={`Altre partite in programma (${altreInProgramma.length})`}>
          {altreInProgramma.map((m) => (
            <RigaPartita key={m._id} match={m}>
              <span className="tabular-nums text-zinc-500">
                {presenti(m).length}/{m.postiDisponibili}
              </span>
            </RigaPartita>
          ))}
          <Link href="/calendario" className="block px-4 py-3 text-center text-sm text-green-700 hover:underline dark:text-green-400">
            Apri il calendario →
          </Link>
        </Tendina>
      )}

      {/* In basso: l'ultima partita giocata e, a tendina, tutte le altre concluse */}
      {ultima && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Ultima partita</h2>
          <Link href={`/partite/${ultima._id}`} className="block">
            <Card className="space-y-1 transition hover:border-green-600">
              <p className="text-center text-sm capitalize text-zinc-500">
                {formatData(ultima.data, { weekday: 'long', day: 'numeric', month: 'long' })} · {ultima.luogo}
              </p>
              <div className="flex justify-between px-2 text-xs font-semibold">
                <span className="text-blue-600 dark:text-blue-400">Squadra A</span>
                <span className="text-orange-600 dark:text-orange-400">Squadra B</span>
              </div>
              <Tabellino match={ultima} />
            </Card>
          </Link>
        </section>
      )}

      {concluse.length > 0 && (
        <Tendina titolo={`Partite concluse (${concluse.length})`}>
          {concluse.map((m) => (
            <RigaPartita key={m._id} match={m}>
              {m.stato === 'giocata' && m.risultato?.golA != null ? (
                <Punteggio match={m} mioId={player._id} />
              ) : (
                <StatoBadge match={m} />
              )}
            </RigaPartita>
          ))}
        </Tendina>
      )}
    </div>
  )
}

function Tendina({ titolo, children }: { titolo: string; children: ReactNode }) {
  return (
    <details className="group rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
        {titolo}
        <span className="text-zinc-400 transition group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>
      <div className="divide-y divide-zinc-100 border-t border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">{children}</div>
    </details>
  )
}

function RigaPartita({ match, children }: { match: Match; children: ReactNode }) {
  return (
    <Link href={`/partite/${match._id}`} className="flex items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800">
      <span className="min-w-0">
        <span className="block capitalize">{formatData(match.data, breve)}</span>
        <span className="block truncate text-xs text-zinc-500">{match.luogo}</span>
      </span>
      {children}
    </Link>
  )
}

// Il conto alla rovescia grande: apertura, chiusura delle convocazioni o calcio d'inizio.
function ContoAllaRovescia({ match }: { match: Match }) {
  const box = (label: string, target: string, colore: string, sotto: string) => (
    <div className={`rounded-xl p-4 text-center ${colore}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="my-1 text-4xl">
        <Countdown target={target} />
      </p>
      <p className="text-xs capitalize opacity-80">{sotto}</p>
    </div>
  )
  switch (finestra(match)) {
    case 'non_ancora':
      return box(
        'Le convocazioni aprono tra',
        match.aperturaConvocazioni,
        'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100',
        formatData(match.aperturaConvocazioni, breve),
      )
    case 'aperta':
      return box(
        'Convocazioni aperte · chiudono tra',
        match.chiusuraConvocazioni,
        'bg-green-600 text-white',
        `entro ${formatData(match.chiusuraConvocazioni, breve)}`,
      )
    case 'scaduta':
      return <div className="rounded-xl bg-amber-50 p-4 text-center text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">⏳ Convocazioni scadute, in attesa delle squadre</div>
    case 'chiusa':
      return new Date(match.data) > new Date()
        ? box(
            match.squadraA.length ? '🔒 Squadre fatte · si gioca tra' : '🔒 Convocazioni chiuse · si gioca tra',
            match.data,
            'bg-blue-600 text-white',
            formatData(match.data, breve),
          )
        : null
  }
}

function ProssimaPartita({
  match,
  player,
  citta,
  lega,
}: {
  match: Match
  player: Player & { ospite?: boolean }
  citta?: { lat: number; lon: number }
  lega: string
}) {
  const count = presenti(match).length
  const inAttesa = ordinati(match, 'riserva').length
  const formato = formatoInCorso(match)
  const inLista = presenti(match).some((c) => c.giocatore._id === player._id)
  const quotaDaPagare = match.quota != null && inLista && !match.pagamenti.some((p) => p.giocatoreId === player._id)
  const miaSquadra = match.squadraA.some((p) => p._id === player._id) ? 'A' : match.squadraB.some((p) => p._id === player._id) ? 'B' : null

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Prossima partita</h2>
      <Card className="space-y-4 border-2 border-green-600">
        <Link href={`/partite/${match._id}`} className="block space-y-1">
          <h3 className="text-xl font-bold leading-tight">
            <span className="block capitalize">{giornoPartita(match.data)}</span>
            <span className="block">
              Inizio {oraPartita(match.data)}
              <Suspense>
                <MeteoPartita citta={citta} data={match.data} compatto />
              </Suspense>
            </span>
          </h3>
          <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">🏟️ {lega}</p>
          <p className="text-sm text-zinc-500">
            📍 {match.luogo}
            {match.quota != null && ` · ${match.quota} €`}
          </p>
        </Link>

        <ContoAllaRovescia match={match} />

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="h-2 flex-1 rounded bg-zinc-200 dark:bg-zinc-800">
              <span className="block h-2 rounded bg-green-600" style={{ width: `${Math.min(100, (count / match.postiDisponibili) * 100)}%` }} />
            </span>
            <span className="tabular-nums">
              {formato ? `${formato.iscritti} iscritti` : `${count}/${match.postiDisponibili} in lista`}
            </span>
          </div>
          {formato && formato.iscritti >= 2 && (
            <p className="text-xs text-zinc-500">
              📋 Se si chiudesse ora: {formato.perSquadra} contro {formato.perSquadra}
              {formato.inAttesa > 0 && ` (${formato.inAttesa} in lista d'attesa)`}
            </p>
          )}
          {inAttesa > 0 && <p className="text-xs text-amber-700 dark:text-amber-400">Lista piena · {inAttesa} in lista d&apos;attesa</p>}
          {miaSquadra && (
            <p className={`text-xs font-medium ${miaSquadra === 'A' ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
              Sei nella Squadra {miaSquadra}
              {match.pettorine === miaSquadra && ' · 🦺 porta la pettorina!'}
            </p>
          )}
          {quotaDaPagare && (
            <Link href={`/partite/${match._id}`} className="block text-xs font-medium text-red-600 hover:underline">
              💶 Quota da pagare: {match.quota} € · tocca per pagare
            </Link>
          )}
        </div>

        {!player.ospite && <RispostaButtons match={match} playerId={player._id} />}

        <Link href={`/partite/${match._id}`} className="block text-center text-sm text-green-700 hover:underline dark:text-green-400">
          Lista, squadre e dettagli →
        </Link>
      </Card>
    </section>
  )
}

// Risultato: in grassetto i gol della squadra vincente, solo se io ero in quella squadra.
function Punteggio({ match, mioId }: { match: Match; mioId: string }) {
  const golA = match.risultato?.golA ?? 0
  const golB = match.risultato?.golB ?? 0
  const mia = match.squadraA.some((p) => p._id === mioId) ? 'A' : match.squadraB.some((p) => p._id === mioId) ? 'B' : null
  const vinta = (mia === 'A' && golA > golB) || (mia === 'B' && golB > golA)
  return (
    <span className="tabular-nums text-zinc-600 dark:text-zinc-300">
      <span className={vinta && mia === 'A' ? 'font-bold text-zinc-900 dark:text-white' : ''}>{golA}</span>
      {' – '}
      <span className={vinta && mia === 'B' ? 'font-bold text-zinc-900 dark:text-white' : ''}>{golB}</span>
    </span>
  )
}
