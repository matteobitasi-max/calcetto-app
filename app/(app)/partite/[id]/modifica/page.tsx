import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { salvaPartita } from '@/app/actions'
import { requireAdmin } from '@/lib/player'
import { getMatch } from '@/lib/matches'
import { Loading, PageTitle } from '@/components/ui'
import { MatchForm } from '../../match-form'

export default function ModificaPartitaPage({ params }: PageProps<'/partite/[id]/modifica'>) {
  return (
    <>
      <PageTitle>Modifica partita</PageTitle>
      <Suspense fallback={<Loading />}>
        <Form params={params} />
      </Suspense>
    </>
  )
}

async function Form({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }] = await Promise.all([params, requireAdmin()])
  const match = await getMatch(id)
  if (!match) notFound()
  return <MatchForm action={salvaPartita.bind(null, match._id)} match={match} submitLabel="Salva" />
}
