import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { salvaGiocatore } from '@/app/actions'
import { displayName, requireIn } from '@/lib/player'
import { getPlayer } from '@/lib/matches'
import { Loading, PageTitle } from '@/components/ui'
import { getT } from '@/lib/lingua'
import { PlayerForm } from '../../player-form'

export default function ModificaGiocatorePage({ params }: PageProps<'/giocatori/[id]/modifica'>) {
  return (
    <Suspense fallback={<Loading />}>
      <Form params={params} />
    </Suspense>
  )
}

async function Form({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const player = await getPlayer(id)
  if (!player) notFound()
  const [, t] = await Promise.all([requireIn(player.legaId, 'organizzatore'), getT()])
  return (
    <>
      <PageTitle>{t('Modifica {nome}', { nome: displayName(player) })}</PageTitle>
      <PlayerForm action={salvaGiocatore.bind(null, player._id)} player={player} submitLabel={t('Salva')} />
    </>
  )
}
