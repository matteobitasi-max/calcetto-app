import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { requirePlayer } from '@/lib/player'
import { Loading } from '@/components/ui'

export default function ProfiloPage() {
  return (
    <Suspense fallback={<Loading />}>
      <VaiAlProfilo />
    </Suspense>
  )
}

async function VaiAlProfilo(): Promise<null> {
  const me = await requirePlayer()
  redirect(`/giocatori/${me._id}`)
}
