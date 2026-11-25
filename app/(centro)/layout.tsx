import Image from 'next/image'
import { Suspense } from 'react'
import { UserButton } from '@clerk/nextjs'
import { getMioCentro } from '@/lib/centro'
import { scegliModo } from '@/app/centro-actions'
import { MenuCentro } from '@/components/menu-centro'

// Il gestionale del centro sportivo: testata con il nome del centro, il menu delle sezioni e il passaggio
// alla versione giocatore. Pensato soprattutto per il computer, ma va anche sul telefono.
export default function CentroLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-stone-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/95 pt-[var(--safe-area-inset-top,env(safe-area-inset-top))] backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 lg:px-6">
          <Image src="/icon-192.png" alt="" width={36} height={36} className="rounded-lg" />
          <Suspense fallback={<span className="flex-1" />}>
            <NomeCentro />
          </Suspense>
          <form action={scegliModo.bind(null, 'giocatore')}>
            <button type="submit" className="rounded-lg px-2 py-1 text-xs font-medium text-stone-500 hover:bg-stone-100 dark:hover:bg-zinc-800" title="Passa alla versione Giocatore / Allenatore">
              ⚽ <span className="hidden sm:inline">Versione giocatore</span>
            </button>
          </form>
          <UserButton />
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-2 lg:px-6">
          <MenuCentro />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 p-4 pb-[max(1rem,var(--safe-area-inset-bottom,env(safe-area-inset-bottom)))] lg:px-6">{children}</main>
    </div>
  )
}

async function NomeCentro() {
  const centro = await getMioCentro()
  return (
    <div className="min-w-0 flex-1">
      <p className="truncate font-bold leading-tight">{centro?.nome ?? 'Il tuo centro sportivo'}</p>
      <p className="text-xs font-medium uppercase tracking-wide text-orange-600">Gestionale centro sportivo</p>
    </div>
  )
}
