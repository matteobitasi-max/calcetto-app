import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { SignOutButton } from '@clerk/nextjs'
import { canEditPlayers, displayName, membroDi } from '@/lib/player'
import { getPlayer, getPlayerStats, getStorico, type PartitaGiocata, type PlayerStats } from '@/lib/matches'
import { formatData } from '@/lib/dates'
import { caricaFoto } from '@/app/actions'
import { AvatarUpload } from '@/components/avatar-upload'
import { NotificheToggle } from '@/components/notifiche-toggle'
import { Avatar, ButtonLink, Card, Loading, Overall, SkillBars, buttonClass } from '@/components/ui'

export default function GiocatorePage({ params }: PageProps<'/giocatori/[id]'>) {
  return (
    <Suspense fallback={<Loading />}>
      <Profilo params={params} />
    </Suspense>
  )
}

async function Profilo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const player = await getPlayer(id)
  // Le schede si vedono solo tra membri della stessa lega.
  const me = await membroDi(player?.legaId)
  if (!player || !me) notFound()
  const [stats, storico] = await Promise.all([getPlayerStats(id, me.lega._id), getStorico(id)])

  const fullName = [player.nome, player.cognome].filter(Boolean).join(' ')
  const canEdit = canEditPlayers(me)
  const mio = me._id === player._id
  const ruoli = [
    player.isAdmin ? 'organizzatore' : player.puoModificareGiocatori && 'valutatore',
    !player.isAdmin && player.puoInserireRisultati && 'refertatore',
  ]

  return (
    <div className="space-y-4">
      {mio && <p className="text-sm font-medium text-green-700 dark:text-green-400">Il mio profilo</p>}
      <Card className="flex items-center gap-4">
        {canEdit ? (
          <AvatarUpload action={caricaFoto.bind(null, player._id)} size={72}>
            <Avatar player={player} size={72} />
          </AvatarUpload>
        ) : (
          <Avatar player={player} size={72} />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <span className="truncate">{displayName(player)}</span>
            <Overall player={player} />
          </h1>
          {player.soprannome && <p className="text-sm text-zinc-500">{fullName}</p>}
          <p className="text-sm capitalize text-zinc-500">
            {[player.ruolo, player.piede && `piede ${player.piede}`, ...ruoli, player.attivo === false && 'non attivo']
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        {canEdit && (
          <ButtonLink href={`/giocatori/${player._id}/modifica`} variant="secondary">
            Modifica
          </ButtonLink>
        )}
      </Card>

      <Statistiche stats={stats} />

      <Card>
        <h2 className="mb-3 font-semibold">Caratteristiche</h2>
        <SkillBars player={player} />
      </Card>

      <Storico partite={storico} />

      {mio && (
        <div className="space-y-3">
          <NotificheToggle variant="impostazione" />
          <SignOutButton redirectUrl="/sign-in">
            <button className={`${buttonClass('secondary')} w-full`}>Esci</button>
          </SignOutButton>
        </div>
      )}
    </div>
  )
}

function Statistiche({ stats: s }: { stats: PlayerStats }) {
  if (s.giocate === 0) {
    return <Card className="text-sm text-zinc-500">Le statistiche compariranno dopo la prima partita con il risultato.</Card>
  }
  const pct = (n: number) => Math.round((n / s.giocate) * 100)
  const media = (n: number) => (n / s.giocate).toFixed(1)

  return (
    <Card className="space-y-4">
      <h2 className="font-semibold">Statistiche</h2>
      <dl className="grid grid-cols-4 gap-2 text-center">
        {(
          [
            ['Partite', s.giocate, ''],
            ['Vittorie', `${pct(s.vinte)}%`, 'text-green-600'],
            ['Gol', s.gol, ''],
            ['MVP 🫑', s.mvp, 'text-amber-500'],
          ] as const
        ).map(([label, value, cls]) => (
          <div key={label} className="flex flex-col-reverse rounded-lg bg-zinc-50 py-2 dark:bg-zinc-950">
            <dt className="text-xs text-zinc-500">{label}</dt>
            <dd className={`text-2xl font-bold tabular-nums ${cls}`}>{value}</dd>
          </div>
        ))}
      </dl>

      <div className="space-y-1">
        <div className="flex h-3 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800" aria-hidden>
          <span className="bg-green-600" style={{ width: `${pct(s.vinte)}%` }} />
          <span className="bg-zinc-400" style={{ width: `${pct(s.pari)}%` }} />
          <span className="bg-red-500" style={{ width: `${pct(s.perse)}%` }} />
        </div>
        <p className="flex justify-between text-xs text-zinc-500">
          <span className="text-green-700 dark:text-green-400">{s.vinte} vinte</span>
          <span>{s.pari} pari</span>
          <span className="text-red-600">{s.perse} perse</span>
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
        {(
          [
            ['Gol fatti', s.gol],
            ['Gol a partita', media(s.gol)],
            ['Gol subiti', s.gs],
            ['Subiti a partita', media(s.gs)],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="flex justify-between gap-2 border-b border-zinc-100 pb-1 dark:border-zinc-800">
            <dt className="text-zinc-500">{label}</dt>
            <dd className="font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}

const ESITO = {
  V: 'bg-green-600 text-white',
  P: 'bg-zinc-400 text-white',
  S: 'bg-red-500 text-white',
}

function Storico({ partite }: { partite: PartitaGiocata[] }) {
  if (partite.length === 0) return null
  return (
    <Card>
      <h2 className="mb-3 flex items-center justify-between font-semibold">
        Ultime partite
        <span className="flex gap-1">
          {[...partite].reverse().map((p) => {
            const e = p.fatti > p.subiti ? 'V' : p.fatti < p.subiti ? 'S' : 'P'
            return (
              <span key={p._id} className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${ESITO[e]}`}>
                {e}
              </span>
            )
          })}
        </span>
      </h2>
      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {partite.map((p) => {
          const e = p.fatti > p.subiti ? 'V' : p.fatti < p.subiti ? 'S' : 'P'
          return (
            <li key={p._id}>
              <Link href={`/partite/${p._id}`} className="flex items-center gap-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold ${ESITO[e]}`}>{e}</span>
                <span className="min-w-0 flex-1">
                  <span className="block capitalize">{formatData(p.data, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                  <span className="block truncate text-xs text-zinc-500">{p.luogo}</span>
                </span>
                <span className="text-right">
                  <span className="block font-bold tabular-nums">
                    {p.fatti} – {p.subiti}
                  </span>
                  <span className="block text-xs">
                    {p.gol > 0 && `⚽${p.gol > 1 ? `×${p.gol}` : ''}`}
                    {p.mvp && ' 🫑'}
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
