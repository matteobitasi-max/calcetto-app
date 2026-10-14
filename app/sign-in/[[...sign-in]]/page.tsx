import Image from 'next/image'
import { Suspense } from 'react'
import { AccessoNativo } from '@/components/accesso-nativo'

export default function SignInPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
      <div className="flex flex-col items-center gap-2">
        <Image src="/icon-512.png" alt="" width={120} height={120} className="rounded-[22%] shadow-lg" priority />
        <h1 className="text-3xl font-bold">The Cap</h1>
        <p className="text-zinc-500">Crea la tua Squadra</p>
      </div>
      <Suspense>
        <AccessoNativo />
      </Suspense>
    </main>
  )
}
