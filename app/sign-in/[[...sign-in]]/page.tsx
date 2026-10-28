import Image from 'next/image'
import { Suspense } from 'react'
import { AccessoNativo } from '@/components/accesso-nativo'
import { getT } from '@/lib/lingua'
import { MenuLingua } from '@/components/menu-lingua'

export default async function SignInPage() {
  const t = await getT()
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-6 p-4 pt-20">
      <div className="absolute right-4 top-[max(1rem,var(--safe-area-inset-top,env(safe-area-inset-top)))]">
        <MenuLingua />
      </div>
      <div className="flex flex-col items-center gap-2">
        <Image src="/icon-512.png" alt="" width={120} height={120} className="rounded-[22%] shadow-lg" priority />
        <h1 className="text-3xl font-bold">The Cap</h1>
        <p className="text-zinc-500">{t('Crea la tua Squadra')}</p>
      </div>
      <Suspense>
        <AccessoNativo />
      </Suspense>
    </main>
  )
}
