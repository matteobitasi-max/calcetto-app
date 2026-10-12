import { Suspense } from 'react'
import { salvaGiocatore } from '@/app/actions'
import { requireAdmin } from '@/lib/player'
import { Loading, PageTitle } from '@/components/ui'
import { PlayerForm } from '../player-form'

export default function NuovoGiocatorePage() {
  return (
    <>
      <PageTitle>Nuovo giocatore</PageTitle>
      <Suspense fallback={<Loading />}>
        <Form />
      </Suspense>
    </>
  )
}

async function Form() {
  await requireAdmin()
  return <PlayerForm action={salvaGiocatore.bind(null, null)} submitLabel="Aggiungi alla rosa" />
}
