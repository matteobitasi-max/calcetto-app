import { Suspense } from 'react'
import { salvaPartita } from '@/app/actions'
import { getMemberships, requireAdmin, requireIn } from '@/lib/player'
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
  const [{ giorno, lega }, mie] = await Promise.all([searchParams, getMemberships()])
  // Dal calendario si può creare la partita in una lega diversa da quella attiva.
  const admin = typeof lega === 'string' ? await requireIn(lega, 'organizzatore') : await requireAdmin()
  return (
    <>
      {mie.length > 1 && (
        <p className="mb-3 text-sm text-zinc-500">
          Nella lega <b>{admin.lega.nome}</b>
        </p>
      )}
      <MatchForm
        action={salvaPartita.bind(null, null)}
        giorno={typeof giorno === 'string' ? giorno : undefined}
        legaId={admin.lega._id}
        submitLabel="Crea partita"
      />
    </>
  )
}
