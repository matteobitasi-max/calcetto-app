import Link from 'next/link'
import { Suspense } from 'react'
import { getCurrentPlayer, type Player } from '@/lib/player'
import { getPastMatches, getUpcomingMatches, ordinati, presenti, type Match } from '@/lib/matches'
import { formatData } from '@/lib/dates'
import { assicuraRicorrenze } from '@/lib/series'
import { ButtonLink, Card, Loading, PageTitle, StatoBadge } from '@/components/ui'
import { FinestraInfo } from './partite/finestra-info'
import { RispostaButtons } from './partite/risposta-buttons'
import { NotificheToggle } from '@/components/notifiche-toggle'

export default function Home() {
  return (
    <Suspense fallback={<Loading />}>
      <Partite />
    </Suspense>
  )
}

async function Partite() {
  const player = await getCurrentPlayer()
  if (!player || player.attivo === false) return <NotInRoster />

  await assicuraRicorrenze()
  const [upcoming, past] = await Promise.all([getUpcomingMatches(), getPastMatches(10)])
  // Con le partite ricorrenti l'elenco può essere lungo: qui solo le prossime, il resto nel calendario.
  const prossime = upcoming.slice(0, 3)

  return (
    <div className="space-y-8">
      <NotificheToggle variant="banner" />
      <div>
        <PageTitle
          action={
            player.isAdmin && (
              <div className="flex gap-2">
                <ButtonLink href="/partite/ricorrenti" variant="secondary" title="Partite ricorrenti">
                  🔁
                </ButtonLink>
                <ButtonLink href="/partite/nuova">+ Nuova partita</ButtonLink>
              </div>
            )
          }
        >
          Prossime partite
        </PageTitle>
        {upcoming.length === 0 ? (
          <Card className="text-sm text-zinc-500">Nessuna partita in programma.</Card>
        ) : (
          <div className="space-y-3">
            {prossime.map((m) => (
              <MatchCard key={m._id} match={m} player={player} />
            ))}
            {upcoming.length > prossime.length && (
              <Link href="/calendario" className="block text-center text-sm text-green-700 hover:underline dark:text-green-400">
                Altre {upcoming.length - prossime.length} partite nel calendario →
              </Link>
            )}
          </div>
        )}
      </div>

      {past.length > 0 && (
        <div>
          <h2 className="mb-3 font-semibold text-zinc-500">Partite passate</h2>
          <Card className="divide-y divide-zinc-200 p-0 dark:divide-zinc-800">
            {past.map((m) => (
              <Link key={m._id} href={`/partite/${m._id}`} className="flex items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800">
                <span>
                  {formatData(m.data, { dateStyle: 'medium' })} · {m.luogo}
                </span>
                {m.stato === 'giocata' && m.risultato?.golA != null ? (
                  <span className="font-bold tabular-nums">
                    {m.risultato.golA} – {m.risultato.golB}
                  </span>
                ) : (
                  <StatoBadge stato={m.stato} />
                )}
              </Link>
            ))}
          </Card>
        </div>
      )}
    </div>
  )
}

function MatchCard({ match, player }: { match: Match; player: Player }) {
  const count = presenti(match).length
  const inAttesa = ordinati(match, 'riserva').length
  return (
    <Card className="space-y-3">
      <Link href={`/partite/${match._id}`} className="block space-y-1">
        <h3 className="font-semibold capitalize">{formatData(match.data)}</h3>
        <p className="text-sm text-zinc-500">
          📍 {match.luogo}
          {match.quota != null && ` · ${match.quota} €`}
        </p>
        <div className="flex items-center gap-2 text-sm">
          <span className="h-2 flex-1 rounded bg-zinc-200 dark:bg-zinc-800">
            <span className="block h-2 rounded bg-green-600" style={{ width: `${Math.min(100, (count / match.postiDisponibili) * 100)}%` }} />
          </span>
          <span className="tabular-nums">
            {count}/{match.postiDisponibili}
          </span>
        </div>
        {inAttesa > 0 && <p className="text-xs text-amber-700 dark:text-amber-400">Lista piena · {inAttesa} in lista d&apos;attesa</p>}
        <FinestraInfo match={match} />
      </Link>
      <RispostaButtons match={match} playerId={player._id} />
    </Card>
  )
}

function NotInRoster() {
  return (
    <Card>
      <h1 className="mb-2 text-lg font-semibold">Non sei ancora nella rosa</h1>
      <p className="text-sm text-zinc-500">
        Chiedi all&apos;organizzatore di aggiungerti con l&apos;email con cui hai fatto l&apos;accesso (verificata), poi
        ricarica la pagina.
      </p>
    </Card>
  )
}
