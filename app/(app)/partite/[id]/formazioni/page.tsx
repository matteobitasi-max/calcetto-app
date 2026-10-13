import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { salvaFormazioni } from '@/app/actions'
import { displayName, requireIn } from '@/lib/player'
import { getMatch, presenti } from '@/lib/matches'
import { avatarUrl } from '@/lib/image'
import { formatData } from '@/lib/dates'
import { sanity } from '@/lib/sanity'
import { Card, Loading, PageTitle } from '@/components/ui'
import { FormazioniEditor, type GiocatoreFormazione } from './formazioni-editor'

export default function FormazioniPage({ params }: PageProps<'/partite/[id]/formazioni'>) {
  return (
    <>
      <PageTitle>Formazioni</PageTitle>
      <Suspense fallback={<Loading />}>
        <Editor params={params} />
      </Suspense>
    </>
  )
}

async function Editor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const match = await getMatch(id)
  if (!match) notFound()
  await requireIn(match.legaId, 'organizzatore')

  const indietro = (
    <Link href={`/partite/${match._id}`} className="text-sm text-green-700 hover:underline dark:text-green-400">
      ← Torna alla partita
    </Link>
  )
  if (match.stato !== 'chiusa') {
    return (
      <Card className="space-y-2">
        <p>Le formazioni si fanno dopo aver chiuso le convocazioni.</p>
        {indietro}
      </Card>
    )
  }

  const giocatori: GiocatoreFormazione[] = presenti(match).map(({ giocatore: p }) => ({
    _id: p._id,
    ruolo: p.ruolo,
    caratteristiche: p.caratteristiche,
    nome: displayName(p),
    foto: avatarUrl(p.foto, 64),
    iniziali: displayName(p)
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase(),
  }))
  if (giocatori.length < 2) {
    return (
      <Card className="space-y-2">
        <p>Servono almeno 2 giocatori in lista.</p>
        {indietro}
      </Card>
    )
  }

  // L'ultima partita precedente della lega con le formazioni fatte.
  const prima = await sanity.fetch<{ data: string; a: string[]; b: string[] } | null>(
    `*[_type == "match" && lega._ref == $lega && _id != $id && data < $data && count(squadraA) > 0 && count(squadraB) > 0]
      | order(data desc)[0]{data, "a": squadraA[]._ref, "b": squadraB[]._ref}`,
    { lega: match.legaId, id: match._id, data: match.data },
  )
  const precedente = prima && {
    quando: formatData(prima.data, { day: 'numeric', month: 'long' }),
    lati: Object.fromEntries([...prima.a.map((id) => [id, 'A' as const]), ...prima.b.map((id) => [id, 'B' as const])]),
  }

  // Chi è in lista parte dalla squadra in cui era già (se le formazioni esistono).
  const iniziale = Object.fromEntries([
    ...match.squadraA.map((p) => [p._id, 'A' as const]),
    ...match.squadraB.map((p) => [p._id, 'B' as const]),
  ])

  return (
    <div className="space-y-3">
      <p className="text-sm capitalize text-zinc-500">
        {formatData(match.data)} · {match.luogo} · {giocatori.length} in lista
      </p>
      <FormazioniEditor
        giocatori={giocatori}
        iniziale={iniziale}
        precedente={precedente}
        pettorineIniziali={match.pettorine}
        giaUfficiali={!!match.formazioniUfficialiIl}
        salva={salvaFormazioni.bind(null, match._id)}
      />
    </div>
  )
}
