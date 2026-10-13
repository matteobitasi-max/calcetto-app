import Link from 'next/link'
import { Suspense } from 'react'
import { displayName, requirePlayer, type Player } from '@/lib/player'
import { getAllStats, getPlayers, type PlayerStats } from '@/lib/matches'
import { Avatar, Card, Loading, PageTitle } from '@/components/ui'

export default function ClassificaPage() {
  return (
    <>
      <PageTitle>Classifica</PageTitle>
      <Suspense fallback={<Loading />}>
        <Classifiche />
      </Suspense>
    </>
  )
}

type Riga = { player: Player; s: PlayerStats }

async function Classifiche() {
  const me = await requirePlayer()
  const [players, stats] = await Promise.all([getPlayers(me.lega._id), getAllStats(me.lega._id)])
  const righe: Riga[] = players.flatMap((player) => {
    const s = stats.get(player._id)
    return s && s.giocate > 0 ? [{ player, s }] : []
  })

  if (righe.length === 0) {
    return <Card className="text-sm text-zinc-500">Le classifiche compariranno dopo la prima partita con il risultato.</Card>
  }

  const perc = (s: PlayerStats) => Math.round((s.vinte / s.giocate) * 100)

  return (
    <div className="space-y-4">
      <Tabella
        titolo="⚽ Marcatori"
        righe={righe.filter((r) => r.s.gol > 0).sort((a, b) => b.s.gol - a.s.gol || a.s.giocate - b.s.giocate)}
        valore={(s) => s.gol}
        dettaglio={(s) => `${(s.gol / s.giocate).toFixed(1)} a partita`}
      />
      <Tabella
        titolo="🫑 MVP"
        righe={righe.filter((r) => r.s.mvp > 0).sort((a, b) => b.s.mvp - a.s.mvp || a.s.giocate - b.s.giocate)}
        valore={(s) => s.mvp}
        dettaglio={(s) => `su ${s.giocate} partite`}
      />
      <Tabella
        titolo="🏆 Vittorie"
        righe={[...righe].sort((a, b) => perc(b.s) - perc(a.s) || b.s.giocate - a.s.giocate)}
        valore={(s) => `${perc(s)}%`}
        dettaglio={(s) => `${s.vinte}V ${s.pari}P ${s.perse}S`}
      />
      <Tabella
        titolo="🧱 Meno gol subiti"
        righe={[...righe].sort((a, b) => a.s.gs / a.s.giocate - b.s.gs / b.s.giocate)}
        valore={(s) => (s.gs / s.giocate).toFixed(1)}
        dettaglio={(s) => `${s.gs} GS in ${s.giocate} partite`}
      />
    </div>
  )
}

function Tabella({
  titolo,
  righe,
  valore,
  dettaglio,
}: {
  titolo: string
  righe: Riga[]
  valore: (s: PlayerStats) => string | number
  dettaglio: (s: PlayerStats) => string
}) {
  if (righe.length === 0) return null
  return (
    <Card>
      <h2 className="mb-3 font-semibold">{titolo}</h2>
      <ol className="space-y-2">
        {righe.slice(0, 10).map(({ player, s }, i) => (
          <li key={player._id} className="flex items-center gap-3">
            <span className="w-5 text-right text-sm tabular-nums text-zinc-400">{i + 1}</span>
            <Avatar player={player} size={32} />
            <Link href={`/giocatori/${player._id}`} className="min-w-0 flex-1 hover:underline">
              <span className="block truncate text-sm font-medium">{displayName(player)}</span>
              <span className="block text-xs text-zinc-500">{dettaglio(s)}</span>
            </Link>
            <span className="text-lg font-bold tabular-nums">{valore(s)}</span>
          </li>
        ))}
      </ol>
    </Card>
  )
}
