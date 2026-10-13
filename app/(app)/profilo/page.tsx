import { Suspense } from 'react'
import { requirePlayer } from '@/lib/player'
import { Loading } from '@/components/ui'
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
  return <ProfiloGiocatore id={me._id} />
}
