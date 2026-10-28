import Image from 'next/image'
import { Suspense } from 'react'
import { SignIn } from '@clerk/nextjs'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { TornaNellApp } from './torna-nell-app'
import { getT } from '@/lib/lingua'
import { ScegliLingua } from '@/components/scegli-lingua'

// Accesso per le app iPhone/Android. Google (e Apple) non permettono l'accesso dentro l'app,
// quindi l'app apre questa pagina in una finestra del browser (components/accesso-nativo.tsx).
// Fatto l'accesso, qui si crea un codice monouso e si torna nell'app con thecap://accesso,
// dove il codice fa entrare anche l'app.
export default async function AccessoAppPage() {
  const t = await getT()
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
      <div className="flex flex-col items-center gap-2">
        <Image src="/icon-512.png" alt="" width={96} height={96} className="rounded-[22%] shadow-lg" priority />
        <h1 className="text-3xl font-bold">The Cap</h1>
        <p className="text-zinc-500">{t('Crea la tua Squadra')}</p>
      </div>
      <div className="w-full max-w-sm">
        <ScegliLingua />
      </div>
      <Suspense>
        <Accesso />
      </Suspense>
    </main>
  )
}

async function Accesso() {
  const { userId } = await auth()
  if (!userId) {
    return <SignIn routing="hash" forceRedirectUrl="/accesso-app" signUpForceRedirectUrl="/accesso-app" />
  }
  const client = await clerkClient()
  const { token } = await client.signInTokens.createSignInToken({ userId, expiresInSeconds: 60 })
  return <TornaNellApp url={`thecap://accesso?ticket=${encodeURIComponent(token)}`} />
}
