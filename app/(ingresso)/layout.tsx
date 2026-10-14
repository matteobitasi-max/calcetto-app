import Image from 'next/image'
import Link from 'next/link'
import { Suspense } from 'react'
import { getUtente } from '@/lib/player'

// Pagine prima di entrare in una lega: logo grande e contenuto al centro,
// con il mio account in alto a destra.
export default function IngressoLayout({ children }: LayoutProps<'/'>) {
  return (
    <main className="relative mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-6 bg-zinc-50 p-4 pt-[max(2.5rem,var(--safe-area-inset-top,env(safe-area-inset-top)))] pb-[max(1rem,var(--safe-area-inset-bottom,env(safe-area-inset-bottom)))] dark:bg-zinc-950">
      <Suspense>
        <MioAccount />
      </Suspense>
      <Image src="/icon-512.png" alt="" width={96} height={96} className="rounded-[22%] shadow-lg" priority />
      <div className="w-full">{children}</div>
    </main>
  )
}

// La mia foto (o iniziale) in alto a destra: apre "Il mio account".
async function MioAccount() {
  const utente = await getUtente()
  if (!utente) return null
  const iniziale = (utente.nome || utente.emails[0] || '?').slice(0, 1).toUpperCase()
  return (
    <Link
      href="/account"
      title="Il mio account"
      aria-label="Il mio account"
      className="absolute right-4 top-[max(1rem,var(--safe-area-inset-top,env(safe-area-inset-top)))] flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-zinc-200 font-semibold text-zinc-700 ring-2 ring-green-600 ring-offset-2 ring-offset-zinc-50 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-offset-zinc-950"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- foto dell'account (Google/Apple) */}
      {utente.foto ? <img src={utente.foto} alt="" className="h-full w-full object-cover" /> : iniziale}
    </Link>
  )
}
