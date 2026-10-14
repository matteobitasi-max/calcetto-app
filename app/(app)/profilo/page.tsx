import { Suspense } from 'react'
import { requirePlayer } from '@/lib/player'
import Link from 'next/link'
import { Card, Loading } from '@/components/ui'
import { ProfiloGiocatore } from '../giocatori/profilo-giocatore'

// Il mio profilo: pagina a sé (non dentro "Rosa"), con la mia scheda nella lega attiva.
export default function ProfiloPage() {
  return (
    <Suspense fallback={<Loading />}>
      <MioProfilo />
    </Suspense>
  )
}

async function MioProfilo() {
  const me = await requirePlayer()
  if (me.ospite) {
    return (
      <Card className="space-y-2 text-sm">
        <p>
          👑 Sei in <b>{me.lega.nome}</b> come super admin: qui non hai una scheda giocatore.
        </p>
        <p className="text-zinc-500">Il tuo profilo è nelle tue leghe: sceglila dal menu col nome della lega, in alto.</p>
        <Link href="/leghe" className="inline-block font-medium text-green-700 hover:underline dark:text-green-500">
          Tutte le leghe →
        </Link>
      </Card>
    )
  }
  return <ProfiloGiocatore id={me._id} />
}
