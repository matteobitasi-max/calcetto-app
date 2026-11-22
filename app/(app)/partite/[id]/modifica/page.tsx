import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { salvaPartita } from '@/app/actions'
import { requireIn } from '@/lib/player'
import { getMatch } from '@/lib/matches'
import { Loading, PageTitle } from '@/components/ui'
import { getT } from '@/lib/lingua'
import { MatchForm } from '../../match-form'
import { AggiornaAllApertura } from '@/components/aggiorna-all-apertura'

export default function ModificaPartitaPage({ params }: PageProps<'/partite/[id]/modifica'>) {
  return (
    <Suspense fallback={<Loading />}>
      <Form params={params} />
    </Suspense>
  )
}

async function Form({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const match = await getMatch(id)
  if (!match) notFound()
  const [, t] = await Promise.all([requireIn(match.legaId, 'organizzatore'), getT()])
  return (
    <div className="space-y-4">
      <PageTitle>{match.tipo === 'allenamento' ? t('Modifica allenamento') : t('Modifica partita')}</PageTitle>
      {match.serieId && (
        <p className="rounded-lg bg-zinc-100 p-3 text-sm text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
          🔁 {t('Le modifiche valgono solo per questa partita.')}{' '}
          <Link href={`/partite/ricorrenti/${match.serieId}`} className="font-medium text-green-700 hover:underline dark:text-green-400">
            {t('Modifica invece tutta la serie')} ›
          </Link>
        </p>
      )}
      <AggiornaAllApertura />
      <MatchForm key={match._rev} action={salvaPartita.bind(null, match._id)} match={match} allenamento={match.tipo === 'allenamento'} submitLabel={t('Salva')} />
    </div>
  )
}
