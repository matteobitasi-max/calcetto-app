import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { salvaRisultato } from '@/app/actions'
import { displayName, requireIn, type Player } from '@/lib/player'
import { getMatch, risultatoDa } from '@/lib/matches'
import { avatarUrl } from '@/lib/image'
import { formatData } from '@/lib/dates'
import { Countdown } from '@/components/countdown'
import { Card, Loading, PageTitle } from '@/components/ui'
import { RisultatoEditor, type Giocatore } from './risultato-editor'

export default function RisultatoPage({ params }: PageProps<'/partite/[id]/risultato'>) {
  return (
    <>
      <PageTitle>Risultato</PageTitle>
      <Suspense fallback={<Loading />}>
        <Editor params={params} />
      </Suspense>
    </>
  )
}

const giocatore = (p: Player): Giocatore => ({
  id: p._id,
  nome: displayName(p),
  foto: avatarUrl(p.foto, 64),
  iniziali: displayName(p)
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase(),
})

async function Editor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const match = await getMatch(id)
  if (!match) notFound()
  await requireIn(match.legaId, 'refertatore')

  const indietro = (
    <Link href={`/partite/${match._id}`} className="text-sm text-green-700 hover:underline dark:text-green-400">
      ← Torna alla partita
    </Link>
  )
  const da = risultatoDa(match)

  if (new Date() < da) {
    return (
      <Card className="space-y-2">
        <p>
          La partita non è ancora finita. Potrai inserire il risultato tra <Countdown target={da.toISOString()} />
        </p>
        <p className="text-sm text-zinc-500">{formatData(da.toISOString(), { weekday: 'long', hour: '2-digit', minute: '2-digit' })}</p>
        {indietro}
      </Card>
    )
  }
  if (!match.squadraA.length || !match.squadraB.length) {
    return (
      <Card className="space-y-2">
        <p>Per segnare marcatori e MVP servono le squadre: chiedi all&apos;organizzatore di farle.</p>
        {indietro}
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm capitalize text-zinc-500">
        {formatData(match.data)} · {match.luogo}
      </p>
      <RisultatoEditor
        action={salvaRisultato.bind(null, match._id)}
        squadre={[
          { chiave: 'A', nome: 'Squadra A', colore: 'border-t-blue-500', giocatori: match.squadraA.map(giocatore) },
          { chiave: 'B', nome: 'Squadra B', colore: 'border-t-orange-500', giocatori: match.squadraB.map(giocatore) },
        ]}
        golIniziali={Object.fromEntries(match.marcatori.map((m) => [m.giocatoreId, m.gol]))}
        autogolIniziali={{ A: match.autogolA ?? 0, B: match.autogolB ?? 0 }}
        mvpIniziale={match.mvpId}
      />
    </div>
  )
}
