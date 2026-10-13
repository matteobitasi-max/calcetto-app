import Image from 'next/image'

// Pagine prima di entrare in una lega: logo grande e contenuto al centro.
export default function IngressoLayout({ children }: LayoutProps<'/'>) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-6 bg-zinc-50 p-4 pt-[max(2.5rem,var(--safe-area-inset-top,env(safe-area-inset-top)))] pb-[max(1rem,var(--safe-area-inset-bottom,env(safe-area-inset-bottom)))] dark:bg-zinc-950">
      <Image src="/logo.png" alt="" width={96} height={96} className="rounded-full shadow-lg ring-4 ring-white dark:ring-zinc-800" priority />
      <div className="w-full">{children}</div>
    </main>
  )
}
