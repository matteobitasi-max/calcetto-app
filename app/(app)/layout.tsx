import Link from 'next/link'
import { Suspense } from 'react'
import { UserButton } from '@clerk/nextjs'
import { getCurrentPlayer } from '@/lib/player'
import { Avatar } from '@/components/ui'
import { LogoZoom } from '@/components/logo-zoom'

export default function AppLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-10 border-b pt-[var(--safe-area-inset-top,env(safe-area-inset-top))] border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90">
        <div className="mx-auto flex max-w-2xl items-center gap-4 px-4 py-3">
          <div className="flex shrink-0 items-center gap-2">
            <LogoZoom />
            <Link href="/" className="hidden text-lg font-bold sm:inline">
              Calcetto
            </Link>
          </div>
          <nav className="flex flex-1 flex-wrap gap-x-3 gap-y-1 text-sm">
            <Link href="/" className="hover:underline">Partite</Link>
            <Link href="/calendario" className="hover:underline">Calendario</Link>
            <Link href="/classifica" className="hover:underline">Classifica</Link>
            <Link href="/giocatori" className="hover:underline">Rosa</Link>
          </nav>
          <Suspense fallback={<span className="h-9 w-9 rounded-full bg-zinc-200 dark:bg-zinc-800" />}>
            <MiaFoto />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 p-4 pb-[max(1rem,var(--safe-area-inset-bottom,env(safe-area-inset-bottom)))]">{children}</main>
    </div>
  )
}

// La mia foto in alto a destra: apre il mio profilo con le statistiche.
async function MiaFoto() {
  const me = await getCurrentPlayer()
  // Chi non è (ancora) nella rosa ha comunque bisogno del menu Clerk per uscire.
  if (!me || me.attivo === false) return <UserButton />
  return (
    <Link href="/profilo" title="Il mio profilo" className="shrink-0 rounded-full ring-2 ring-green-600 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900">
      <Avatar player={me} size={34} />
    </Link>
  )
}
