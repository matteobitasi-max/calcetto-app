import { Suspense } from 'react'
import { salvaPartita } from '@/app/actions'
import { requireAdmin } from '@/lib/player'
import { Loading, PageTitle } from '@/components/ui'
import { MatchForm } from '../match-form'

export default function NuovaPartitaPage({ searchParams }: PageProps<'/partite/nuova'>) {
  return (
    <>
      <PageTitle>Nuova partita</PageTitle>
      <Suspense fallback={<Loading />}>
        <Form searchParams={searchParams} />
      </Suspense>
    </>
  )
}

async function Form({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ giorno }] = await Promise.all([searchParams, requireAdmin()])
  return <MatchForm action={salvaPartita.bind(null, null)} giorno={typeof giorno === 'string' ? giorno : undefined} submitLabel="Crea partita" />
}
