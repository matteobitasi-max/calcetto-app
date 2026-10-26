import Link from 'next/link'
import { Suspense } from 'react'
import { salvaPartita } from '@/app/actions'
import { getCurrentPlayer, getMemberships, requireAdmin, requireIn } from '@/lib/player'
import { avatarUrl } from '@/lib/image'
import { Admin, Stemma } from '@/components/lega-menu'
import { Card, Loading, PageTitle } from '@/components/ui'
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
  const [{ giorno, lega, scegli }, mie, attiva] = await Promise.all([searchParams, getMemberships(), getCurrentPlayer()])
  const giornoScelto = typeof giorno === 'string' ? giorno : undefined
  const organizzate = mie.filter((m) => m.isAdmin)

  // Senza lega indicata: quella attiva se la organizzo; altrimenti (o con "Cambia") si sceglie tra quelle che organizzo.
  if (typeof lega !== 'string' && organizzate.length > 1 && (scegli || !attiva?.isAdmin)) {
    return (
      <Card className="space-y-1">
        <p className="px-3 pb-1 font-semibold">In quale lega?</p>
        {organizzate.map((m) => (
          <Link
            key={m.lega._id}
            href={`/partite/nuova?lega=${m.lega._id}${giornoScelto ? `&giorno=${giornoScelto}` : ''}`}
            className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <Stemma lega={{ nome: m.lega.nome, logo: avatarUrl(m.lega.logo, 64) }} size={28} />
            <span className="min-w-0 flex-1 truncate font-medium">{m.lega.nome}</span>
            <Admin />
            <span className="text-zinc-400">›</span>
          </Link>
        ))}
      </Card>
    )
  }

  // Dal calendario (o dalla scelta qui sopra) si può creare la partita in una lega diversa da quella attiva.
  const admin =
    typeof lega === 'string'
      ? await requireIn(lega, 'organizzatore')
      : attiva?.isAdmin || organizzate.length === 0
        ? await requireAdmin()
        : organizzate[0]
  return (
    <>
      {mie.length > 1 && (
        <p className="mb-3 text-sm text-zinc-500">
          Nella lega <b>{admin.lega.nome}</b>
          {organizzate.length > 1 && (
            <>
              {' · '}
              <Link
                href={`/partite/nuova?scegli=1${giornoScelto ? `&giorno=${giornoScelto}` : ''}`}
                className="font-medium text-green-700 hover:underline dark:text-green-400"
              >
                Cambia
              </Link>
            </>
          )}
        </p>
      )}
      <MatchForm action={salvaPartita.bind(null, null)} giorno={giornoScelto} legaId={admin.lega._id} submitLabel="Crea partita" />
    </>
  )
}
