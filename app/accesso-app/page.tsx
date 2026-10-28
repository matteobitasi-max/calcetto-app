import Image from 'next/image'
import { Suspense } from 'react'
import { SignIn, SignUp } from '@clerk/nextjs'
import { SchedeAccesso } from '@/components/schede-accesso'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { TornaNellApp } from './torna-nell-app'
import { getT } from '@/lib/lingua'
import { MenuLingua } from '@/components/menu-lingua'

// Accesso per le app iPhone/Android. Google (e Apple) non permettono l'accesso dentro l'app,
// quindi l'app apre questa pagina in una finestra del browser (components/accesso-nativo.tsx).
// Fatto l'accesso, qui si crea un codice monouso e si torna nell'app con thecap://accesso,
// dove il codice fa entrare anche l'app.
export default async function AccessoAppPage({ searchParams }: PageProps<'/accesso-app'>) {
  const t = await getT()
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-6 p-4 pt-20">
      <div className="absolute right-4 top-[max(1rem,var(--safe-area-inset-top,env(safe-area-inset-top)))]">
        <MenuLingua />
      </div>
      <div className="flex flex-col items-center gap-2">
        <Image src="/icon-512.png" alt="" width={96} height={96} className="rounded-[22%] shadow-lg" priority />
        <h1 className="text-3xl font-bold">The Cap</h1>
        <p className="text-zinc-500">{t('Crea la tua Squadra')}</p>
      </div>
      <Suspense>
        <Accesso searchParams={searchParams} />
      </Suspense>
    </main>
  )
}

async function Accesso({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ userId }, { registrati }] = await Promise.all([auth(), searchParams])
  if (!userId) {
    return (
      <div className="flex w-full flex-col items-center gap-4">
        <SchedeAccesso attiva={registrati ? 'registrati' : 'accedi'} accedi="/accesso-app" registrati="/accesso-app?registrati=1" />
        {registrati ? (
          <SignUp routing="hash" signInUrl="/accesso-app" forceRedirectUrl="/accesso-app" signInForceRedirectUrl="/accesso-app" />
        ) : (
          <SignIn routing="hash" signUpUrl="/accesso-app?registrati=1" forceRedirectUrl="/accesso-app" signUpForceRedirectUrl="/accesso-app" />
        )}
      </div>
    )
  }
  const client = await clerkClient()
  const { token } = await client.signInTokens.createSignInToken({ userId, expiresInSeconds: 60 })
  return <TornaNellApp url={`thecap://accesso?ticket=${encodeURIComponent(token)}`} />
}
