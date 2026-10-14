import Image from 'next/image'
import Link from 'next/link'

// Pagine informative pubbliche (privacy, supporto): leggibili anche senza accesso.
export default function InfoLayout({ children }: LayoutProps<'/'>) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 bg-white p-6 pt-[max(1.5rem,var(--safe-area-inset-top,env(safe-area-inset-top)))] text-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
      <Link href="/" className="flex items-center gap-3">
        <Image src="/icon-512.png" alt="" width={48} height={48} className="rounded-[22%]" />
        <span className="text-xl font-bold">TheCap</span>
      </Link>
      <article className="space-y-4 text-sm leading-relaxed [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_a]:text-green-700 [&_a]:underline">
        {children}
      </article>
    </main>
  )
}
