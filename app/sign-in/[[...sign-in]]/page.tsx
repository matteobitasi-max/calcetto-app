import Image from 'next/image'
import { Suspense } from 'react'
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
      <div className="flex flex-col items-center gap-2">
        <Image src="/logo.png" alt="" width={120} height={120} className="rounded-full shadow-lg ring-4 ring-white" priority />
        <h1 className="text-2xl font-bold">Calcetto</h1>
      </div>
      <Suspense>
        <SignIn />
      </Suspense>
    </main>
  )
}
