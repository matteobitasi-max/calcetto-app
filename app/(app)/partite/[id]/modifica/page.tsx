import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { salvaPartita } from '@/app/actions'
import { requireIn } from '@/lib/player'
import { getMatch } from '@/lib/matches'
import { Loading, PageTitle } from '@/components/ui'
import { getT } from '@/lib/lingua'
import { MatchForm } from '../../match-form'

export default async function ModificaPartitaPage({ params }: PageProps<'/partite/[id]/modifica'>) {
  const t = await getT()
  return (
    <>
      <PageTitle>{t('Modifica partita')}</PageTitle>
      <Suspense fallback={<Loading />}>
        <Form params={params} />
      </Suspense>
    </>
  )
}

async function Form({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const match = await getMatch(id)
  if (!match) notFound()
  const [, t] = await Promise.all([requireIn(match.legaId, 'organizzatore'), getT()])
  return <MatchForm action={salvaPartita.bind(null, match._id)} match={match} submitLabel={t('Salva')} />
}
