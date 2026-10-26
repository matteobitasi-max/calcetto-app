import { Suspense } from 'react'
import { salvaGiocatore } from '@/app/actions'
import { requireAdmin } from '@/lib/player'
import { Loading, PageTitle } from '@/components/ui'
import { getT } from '@/lib/lingua'
import { PlayerForm } from '../player-form'

export default async function NuovoGiocatorePage() {
  const t = await getT()
  return (
    <>
      <PageTitle>{t('Nuovo giocatore')}</PageTitle>
      <Suspense fallback={<Loading />}>
        <Form />
      </Suspense>
    </>
  )
}

async function Form() {
  const [, t] = await Promise.all([requireAdmin(), getT()])
  return <PlayerForm action={salvaGiocatore.bind(null, null)} submitLabel={t('Aggiungi alla rosa')} />
}
