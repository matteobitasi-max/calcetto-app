import { Suspense } from 'react'
import { Loading } from '@/components/ui'
import { ProfiloGiocatore } from '../profilo-giocatore'

export default function GiocatorePage({ params }: PageProps<'/giocatori/[id]'>) {
  return (
    <Suspense fallback={<Loading />}>
      <Profilo params={params} />
    </Suspense>
  )
}

async function Profilo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ProfiloGiocatore id={id} />
}
