import { Suspense } from 'react'
import { Tutorial } from '@/components/tutorial'

// Dopo "Completa il tuo profilo" (solo la prima volta): le funzioni chiave, poi si va dove si stava andando.
// Si può riaprire anche da "Come funziona".
export default function TutorialPage({ searchParams }: PageProps<'/tutorial'>) {
  return (
    <Suspense>
      <Schede searchParams={searchParams} />
    </Suspense>
  )
}

async function Schede({ searchParams }: { searchParams: PageProps<'/tutorial'>['searchParams'] }) {
  const { dopo } = await searchParams
  const vai = typeof dopo === 'string' && dopo.startsWith('/') && !dopo.startsWith('//') ? dopo : '/'
  return <Tutorial dopo={vai} />
}
