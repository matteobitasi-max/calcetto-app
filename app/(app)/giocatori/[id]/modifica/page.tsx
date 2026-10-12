import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { salvaGiocatore, salvaValutazione } from '@/app/actions'
import { displayName, requireEditor } from '@/lib/player'
import { getPlayer } from '@/lib/matches'
import { Loading, PageTitle } from '@/components/ui'
import { PlayerForm } from '../../player-form'

export default function ModificaGiocatorePage({ params }: PageProps<'/giocatori/[id]/modifica'>) {
  return (
    <Suspense fallback={<Loading />}>
      <Form params={params} />
    </Suspense>
  )
}

async function Form({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, me] = await Promise.all([params, requireEditor()])
  const player = await getPlayer(id)
  if (!player) notFound()
  return (
    <>
      <PageTitle>Modifica {displayName(player)}</PageTitle>
      {me.isAdmin ? (
        <PlayerForm action={salvaGiocatore.bind(null, player._id)} player={player} submitLabel="Salva" />
      ) : (
        <PlayerForm action={salvaValutazione.bind(null, player._id)} player={player} submitLabel="Salva" limited />
      )}
    </>
  )
}
