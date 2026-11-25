import Link from 'next/link'
import { VaiA } from '@/components/vai-a'
import { Suspense, type ReactNode } from 'react'
import { IntervisteLega } from '@/components/interviste-lega'
import { CodiceInvito, InvitoLink } from '@/components/invito-link'
import { baseUrl } from '@/lib/url'
import { getCurrentPlayer, getMemberships, getUtente, type Player } from '@/lib/player'
import { finestra, formatoInCorso, getPastMatches, isAllenamento, getPlayers, getUpcomingMatches, ordinati, presenti, type Match } from '@/lib/matches'
import { getT } from '@/lib/lingua'
import type { T } from '@/lib/i18n'
import { nomeSquadra } from '@/lib/teams'
import { indisponibileIl } from '@/lib/roster'
import { isoToRomeLocal } from '@/lib/dates'
import { assicuraRicorrenze } from '@/lib/series'
import { Card, Loading, StatoBadge } from '@/components/ui'
import { PillNuovaPartita } from '@/components/pill-nuova-partita'
import { AzioniHome } from '@/components/azioni-home'
import { Countdown } from '@/components/countdown'
import { NotificheToggle } from '@/components/notifiche-toggle'
import { RispostaButtons } from './partite/risposta-buttons'
import { Tabellino } from './partite/tabellino'
import { MeteoPartita } from '@/components/meteo-partita'
import { EtichettaLega } from '@/components/etichetta-lega'
import { fineTolleranza, statoClub } from '@/lib/club-stato'
import { RigaImpegno } from '@/components/riga-impegno'
import { avatarUrl } from '@/lib/image'

export default function Home() {
  return (
    <Suspense fallback={<Loading />}>
      <Partite />
    </Suspense>
  )
}

const breve = { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' } as const

async function Partite() {
  const [player, mie, utente, t] = await Promise.all([getCurrentPlayer(), getMemberships(), getUtente(), getT()])
  // primo accesso (anche chi entra già in una lega, es. aggiunto con la sua email): prima il profilo
  if (utente?.daCompletare) return <VaiA href={'/completa-profilo?dopo=/'} />
  // Nessuna lega: si sceglie se crearne una o entrare con un invito.
  if (!player) return <VaiA href="/benvenuto" />

  const legaId = player.lega._id
  // le altre leghe in cui gioco (es. la squadra del Club e la lega con gli amici): la loro prossima partita
  const altreLeghe = player.ospite ? [] : mie.filter((m) => m.lega._id !== legaId)
  await Promise.all([legaId, ...altreLeghe.map((m) => m.lega._id)].map((id) => assicuraRicorrenze({ legaId: id })))
  const [upcoming, past, rosa, dalleAltre] = await Promise.all([
    getUpcomingMatches(legaId),
    getPastMatches(legaId, 100),
    getPlayers(legaId),
    altreLeghe.length ? getUpcomingMatches(altreLeghe.map((m) => m.lega._id)) : Promise.resolve([]),
  ])
  const nelleAltre = altreLeghe.flatMap((m) => {
    const prossimaLi = dalleAltre.find((x) => x.legaId === m.lega._id)
    return prossimaLi ? [{ membro: m, match: prossimaLi }] : []
  })
  // lega appena creata (o ancora senza amici): l'invito in cima
  const linkInvito = player.isAdmin && player.lega.codiceInvito ? `${await baseUrl()}/invito/${player.lega.codiceInvito}` : null
  const daSolo = rosa.filter((p) => p.attivo !== false).length <= 1

  const [prossima, ...altreInProgramma] = upcoming
  const ultima = past.find((m) => m.stato === 'giocata' && m.risultato?.golA != null)
  const concluse = past.filter((m) => m !== ultima)

  return (
    <div className="space-y-6 pb-16">
      {/* In alto a destra: ＋ per invitare (organizzatori) e il megafono per scrivere alla squadra (organizzatori e capitano) */}
      <AzioniHome
        invito={linkInvito && !daSolo ? { url: linkInvito, nomeLega: player.lega.nome, codice: player.lega.codiceInvito! } : undefined}
        scrivi={!!player.isAdmin || player.badge === 'capitano'}
      />

      <NotificheToggle variant="banner" />

      {/* Club scaduto: all'organizzatore, l'avviso per rinnovare (o rimettere la lega tra amici) */}
      {player.isAdmin && player.lega.club && player.lega.tipo === 'squadra' && player.lega.clubScadeIl && (
        <AvvisoClubScaduto scadeIl={player.lega.clubScadeIl} legaId={legaId} t={t} />
      )}

      {/* Lega appena nata, ancora da solo: l'invito resta in grande, è il primo passo */}
      {linkInvito && daSolo && (
        <Card className="space-y-3 border-2 border-green-600">
          <h2 className="font-semibold">📨 {t('Invita i tuoi amici')}</h2>
          <p className="text-sm text-zinc-500">{t('“{lega}” è pronta! Chi apre il link entra subito nella lega.', { lega: player.lega.nome })}</p>
          <InvitoLink url={linkInvito} nomeLega={player.lega.nome} />
          <CodiceInvito codice={player.lega.codiceInvito!} />
        </Card>
      )}

      {/* Anche nelle leghe in cui gioco soltanto, se ne organizzo almeno una: la lega si sceglie dopo */}
      {(player.isAdmin || mie.some((m) => m.isAdmin)) && <PillNuovaPartita />}

      {/* In alto: la prossima partita con il conto alla rovescia delle convocazioni */}
      {prossima ? (
        <ProssimaPartita match={prossima} player={player} citta={player.lega.citta} lega={player.lega.nome} t={t} />
      ) : (
        <Card className="text-center text-sm text-zinc-500">{t('Nessuna partita in programma.')}</Card>
      )}

      {/* La prossima partita di ognuna delle mie altre leghe: toccandola si passa a quella lega */}
      {nelleAltre.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{t('Nelle altre leghe')}</h2>
          <Card className="divide-y divide-zinc-200 p-0 dark:divide-zinc-800">
            {nelleAltre.map(({ membro, match }) => (
              <RigaImpegno
                key={match._id}
                match={match}
                lega={<EtichettaLega nome={membro.lega.nome} logo={avatarUrl(membro.lega.logo, 32)} club={!!membro.lega.club && membro.lega.tipo === 'squadra'} />}
                quando={t.data(match.data, breve)}
                dettagli={match.luogo}
                t={t}
              />
            ))}
          </Card>
        </section>
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

      {/* le altre partite in programma, a tendina, sotto le interviste */}
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
        <span className="block capitalize">
          {isAllenamento(match) && '🏃 '}
          {t.data(match.data, breve)}
        </span>
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
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{isAllenamento(match) ? `🏃 ${t('Prossimo allenamento')}` : t('Prossima partita')}</h2>
      <Card className="space-y-4 border-2 border-green-600">
        <Link href={`/partite/${match._id}`} className="block space-y-1">
          <h3 className="text-xl font-bold leading-tight">
            <span className="block capitalize">{t.giorno(match.data)}</span>
            <span className="block">
              {t('Inizio {ora}', { ora: t.ora(match.data) })}
              <Suspense>
                <MeteoPartita citta={match.campo ?? citta} data={match.data} compatto />
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

        {!player.ospite && <RispostaButtons match={match} playerId={player._id} indisponibile={indisponibileIl(player, isoToRomeLocal(match.data).slice(0, 10))} />}

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

// Il Club della squadra è scaduto: durante la tolleranza funziona ancora tutto, poi è in sola lettura.
function AvvisoClubScaduto({ scadeIl, legaId, t }: { scadeIl: string; legaId: string; t: T }) {
  const bloccato = statoClub(scadeIl) === 'sola-lettura'
  const giorno = (iso: string) => t.data(iso, { day: 'numeric', month: 'long' })
  return (
    <Card className="space-y-2 border-2 border-blue-600 bg-blue-50 dark:bg-blue-950">
      <p className="font-semibold text-blue-900 dark:text-blue-100">
        {bloccato ? `🔒 ${t('Club PRO in sola lettura')}` : `⏳ ${t('Il Club PRO di questa squadra è scaduto')}`}
      </p>
      <p className="text-sm text-blue-900/80 dark:text-blue-100/80">
        {bloccato
          ? t('Convocati, formazioni, pagelle e indisponibili si vedono ma non si possono cambiare. Rinnova il Club, oppure rimetti la lega “tra amici”.')
          : t('Funziona ancora tutto fino al {data}: rinnova il Club per non fermarti. Nessun dato va perso.', { data: giorno(fineTolleranza(scadeIl)) })}
      </p>
      <div className="flex flex-wrap gap-3 text-sm font-semibold">
        <Link href={`/club?lega=${legaId}`} className="text-blue-700 hover:underline dark:text-blue-300">
          {t('Rinnova il Club ›')}
        </Link>
        {bloccato && (
          <Link href="/lega" className="text-zinc-600 hover:underline dark:text-zinc-300">
            {t('Impostazioni lega ›')}
          </Link>
        )}
      </div>
    </Card>
  )
}
