import Link from 'next/link'
import { Suspense } from 'react'
import { requireCentro } from '@/lib/centro'
import { salvaPrenotazione } from '@/app/centro-actions'
import { PrenotazioneForm } from '@/components/prenotazione-form'
import { Loading } from '@/components/ui'

export default function NuovaPrenotazionePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={<Loading />}>
      <Nuova searchParams={searchParams} />
    </Suspense>
  )
}

async function Nuova({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [q, centro] = await Promise.all([searchParams, requireCentro()])
  const s = (k: string) => (typeof q[k] === 'string' ? (q[k] as string) : undefined)
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href={`/centro${s('giorno') ? `?giorno=${s('giorno')}` : ''}`} className="text-sm font-medium text-stone-500 hover:underline">
        ‹ Calendario
      </Link>
      <h1 className="text-xl font-extrabold">Nuova prenotazione</h1>
      <PrenotazioneForm centro={centro} action={salvaPrenotazione.bind(null, null)} iniziale={{ giorno: s('giorno'), campo: s('campo'), ora: s('ora') }} />
    </div>
  )
}
