import Link from 'next/link'
import { Suspense, type ReactNode } from 'react'
import { IntervisteLega } from '@/components/interviste-lega'
import { CodiceInvito, InvitoLink } from '@/components/invito-link'
import { baseUrl } from '@/lib/url'
import { redirect } from 'next/navigation'
import { getCurrentPlayer, getMemberships, type Player } from '@/lib/player'
import { finestra, formatoInCorso, getPastMatches, getPlayers, getUpcomingMatches, ordinati, presenti, type Match } from '@/lib/matches'
import { getT } from '@/lib/lingua'
import type { T } from '@/lib/i18n'
import { nomeSquadra } from '@/lib/teams'
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
  const [player, mie, t] = await Promise.all([getCurrentPlayer(), getMemberships(), getT()])
  // Nessuna lega: si sceglie se crearne una o entrare con un invito.
  if (!player) redirect('/benvenuto')

  const legaId = player.lega._id
  await assicuraRicorrenze({ legaId })
  const [upcoming, past, rosa] = await Promise.all([getUpcomingMatches(legaId), getPastMatches(legaId, 100), getPlayers(legaId)])
  // lega appena creata (o ancora senza amici): l'invito in cima
  const daSolo = player.isAdmin && !!player.lega.codiceInvito && rosa.filter((p) => p.attivo !== false).length <= 1

  const [prossima, ...altreInProgramma] = upcoming
  const ultima = past.find((m) => m.stato === 'giocata' && m.risultato?.golA != null)
  const concluse = past.filter((m) => m !== ultima)

  return (
    <div className="space-y-6 pb-16">
      <NotificheToggle variant="banner" />

      {daSolo && (
        <Card className="space-y-3 border-2 border-green-600">
          <h2 className="font-semibold">📨 {t('Invita i tuoi amici')}</h2>
          <p className="text-sm text-zinc-500">{t('“{lega}” è pronta! Chi apre il link entra subito nella lega.', { lega: player.lega.nome })}</p>
          <InvitoLink url={`${await baseUrl()}/invito/${player.lega.codiceInvito}`} nomeLega={player.lega.nome} />
          <CodiceInvito codice={player.lega.codiceInvito!} />
        </Card>
      )}

      {/* Anche nelle leghe in cui gioco soltanto, se ne organizzo almeno una: la lega si sceglie dopo */}
      {(player.isAdmin || mie.some((m) => m.isAdmin)) && <PillNuovaPartita />}
      {(player.isAdmin || player.badge === 'capitano') && <ScriviSquadra />}

      {/* In alto: la prossima partita con il conto alla rovescia delle convocazioni */}
      {prossima ? (
        <ProssimaPartita match={prossima} player={player} citta={player.lega.citta} lega={player.lega.nome} t={t} />
      ) : (
        <Card className="text-center text-sm text-zinc-500">{t('Nessuna partita in programma.')}</Card>
      )}

      {altreInProgramma.length > 0 && (
        <Tendina titolo={t('Altre partite in programma ({n})', { n: altreInProgramma.length })}>
          {altreInProgramma.map((m) => (
            <RigaPartita key={m._id} match={m} t={t}>
              <span className="tabular-nums text-zinc-500">
                {presenti(m).length}/{m.postiDisponibili}
              </span>
            </RigaPartita>
          ))}
          <Link href="/calendario" className="block px-4 py-3 text-center text-sm text-green-700 hover:underline dark:text-green-400">
            {t('Apri il calendario →')}
          </Link>
        </Tendina>
      )}

      {/* In basso: l'ultima partita giocata e, a tendina, tutte le altre concluse */}
      {ultima && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{t('Ultima partita')}</h2>
          <Link href={`/partite/${ultima._id}`} className="block">
            <Card className="space-y-1 transition hover:border-green-600">
              <p className="text-center text-sm capitalize text-zinc-500">
                {t.giorno(ultima.data)} · {ultima.luogo}
              </p>
              <div className="flex justify-between px-2 text-xs font-semibold">
                <span className="text-blue-600 dark:text-blue-400">{ultima.nomeA ?? nomeSquadra('A', t)}</span>
                <span className="text-orange-600 dark:text-orange-400">{ultima.nomeB ?? nomeSquadra('B', t)}</span>
              </div>
              <Tabellino match={ultima} />
            </Card>
          </Link>
        </section>
      )}

      <Suspense>
        <IntervisteLega legaId={legaId} playlist={player.lega.playlistInterviste} />
      </Suspense>

      {concluse.length > 0 && (
        <Tendina titolo={t('Partite concluse ({n})', { n: concluse.length })}>
          {concluse.map((m) => (
            <RigaPartita key={m._id} match={m} t={t}>
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

function RigaPartita({ match, children, t }: { match: Match; children: ReactNode; t: T }) {
  return (
    <Link href={`/partite/${match._id}`} className="flex items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800">
      <span className="min-w-0">
        <span className="block capitalize">{t.data(match.data, breve)}</span>
        <span className="block truncate text-xs text-zinc-500">{match.luogo}</span>
      </span>
      {children}
    </Link>
  )
}

// Il conto alla rovescia grande: apertura, chiusura delle convocazioni o calcio d'inizio.
function ContoAllaRovescia({ match, t }: { match: Match; t: T }) {
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
        t('Le convocazioni aprono tra'),
        match.aperturaConvocazioni,
        'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100',
        t.data(match.aperturaConvocazioni, breve),
      )
    case 'aperta':
      return box(
        t('Convocazioni aperte · chiudono tra'),
        match.chiusuraConvocazioni,
        'bg-green-600 text-white',
        t('entro {data}', { data: t.data(match.chiusuraConvocazioni, breve) }),
      )
    case 'scaduta':
      return <div className="rounded-xl bg-amber-50 p-4 text-center text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">⏳ {t('Convocazioni scadute, in attesa delle squadre')}</div>
    case 'chiusa':
      return new Date(match.data) > new Date()
        ? box(
            `🔒 ${match.squadraA.length ? t('Squadre fatte · si gioca tra') : t('Convocazioni chiuse · si gioca tra')}`,
            match.data,
            'bg-blue-600 text-white',
            t.data(match.data, breve),
          )
        : null
  }
}

function ProssimaPartita({
  match,
  player,
  citta,
  lega,
  t,
}: {
  match: Match
  player: Player & { ospite?: boolean }
  citta?: { lat: number; lon: number }
  lega: string
  t: T
}) {
  const count = presenti(match).length
  const inAttesa = ordinati(match, 'riserva').length
  const formato = formatoInCorso(match)
  const inLista = presenti(match).some((c) => c.giocatore._id === player._id)
  const quotaDaPagare = match.quota != null && inLista && !match.pagamenti.some((p) => p.giocatoreId === player._id)
  const miaSquadra = match.squadraA.some((p) => p._id === player._id) ? 'A' : match.squadraB.some((p) => p._id === player._id) ? 'B' : null

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{t('Prossima partita')}</h2>
      <Card className="space-y-4 border-2 border-green-600">
        <Link href={`/partite/${match._id}`} className="block space-y-1">
          <h3 className="text-xl font-bold leading-tight">
            <span className="block capitalize">{t.giorno(match.data)}</span>
            <span className="block">
              {t('Inizio {ora}', { ora: t.ora(match.data) })}
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

        <ContoAllaRovescia match={match} t={t} />

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="h-2 flex-1 rounded bg-zinc-200 dark:bg-zinc-800">
              <span className="block h-2 rounded bg-green-600" style={{ width: `${Math.min(100, (count / match.postiDisponibili) * 100)}%` }} />
            </span>
            <span className="tabular-nums">
              {formato ? t('{n} iscritti', { n: formato.iscritti }) : t('{n}/{posti} in lista', { n: count, posti: match.postiDisponibili })}
            </span>
          </div>
          {formato && formato.iscritti >= 2 && (
            <p className="text-xs text-zinc-500">
              📋 {t('Se si chiudesse ora: {n} contro {n}', { n: formato.perSquadra })}
              {formato.inAttesa > 0 && ` (${t('{n} in lista d’attesa', { n: formato.inAttesa })})`}
            </p>
          )}
          {inAttesa > 0 && <p className="text-xs text-amber-700 dark:text-amber-400">{t('Lista piena · {n} in lista d’attesa', { n: inAttesa })}</p>}
          {miaSquadra && (
            <p className={`text-xs font-medium ${miaSquadra === 'A' ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
              {match.torneo
                ? t('La tua squadra: {squadra}', { squadra: (miaSquadra === 'A' ? match.nomeA : match.nomeB) ?? miaSquadra })
                : t('Sei nella {squadra}', { squadra: nomeSquadra(miaSquadra, t) })}
              {match.pettorine === miaSquadra && ` · 🦺 ${t('porta la pettorina!')}`}
            </p>
          )}
          {quotaDaPagare && (
            <Link href={`/partite/${match._id}`} className="block text-xs font-medium text-red-600 hover:underline">
              💶 {t('Quota da pagare: {quota} € · tocca per pagare', { quota: match.quota! })}
            </Link>
          )}
        </div>

        {!player.ospite && <RispostaButtons match={match} playerId={player._id} />}

        <Link href={`/partite/${match._id}`} className="block text-center text-sm text-green-700 hover:underline dark:text-green-400">
          {t('Lista, squadre e dettagli →')}
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
