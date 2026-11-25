'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const SEZIONI = [
  { href: '/centro', label: '📅 Calendario' },
  { href: '/centro/pagamenti', label: '💶 Pagamenti' },
  { href: '/centro/statistiche', label: '📊 Statistiche' },
  { href: '/centro/impostazioni', label: '⚙️ Impostazioni' },
]

// Le sezioni del gestionale, a pillole (sul telefono scorrono di lato).
export function MenuCentro() {
  const percorso = usePathname()
  const attiva = (href: string) => (href === '/centro' ? percorso === '/centro' || percorso.startsWith('/centro/prenot') : percorso.startsWith(href))
  return (
    <nav className="-mx-1 flex gap-1.5 overflow-x-auto px-1">
      {SEZIONI.map((s) => (
        <Link
          key={s.href}
          href={s.href}
          aria-current={attiva(s.href) ? 'page' : undefined}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
            attiva(s.href) ? 'bg-stone-900 text-white dark:bg-white dark:text-zinc-900' : 'text-stone-600 hover:bg-stone-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
          }`}
        >
          {s.label}
        </Link>
      ))}
    </nav>
  )
}
