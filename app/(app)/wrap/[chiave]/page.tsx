import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { datiWrap, stagioneMia } from '@/lib/wrap'
import { avatarUrl } from '@/lib/image'
import { Loading } from '@/components/ui'
import { WrapStorie } from '@/components/wrap-storie'

// Il wrap di una stagione terminata: a schermo intero, come le storie.
export default function WrapPage({ params }: { params: Promise<{ chiave: string }> }) {
  return (
    <Suspense fallback={<Loading />}>
      <Wrap params={params} />
    </Suspense>
  )
}

async function Wrap({ params }: { params: Promise<{ chiave: string }> }) {
  const { chiave } = await params
  const trovata = await stagioneMia(chiave)
  if (!trovata) notFound()
  const dati = await datiWrap(trovata.membro, trovata.stagione)
  return <WrapStorie chiave={chiave} dati={dati} logo={avatarUrl(dati.lega.logo, 160)} />
}
