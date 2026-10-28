'use client'

import Link from 'next/link'
import { useT } from './lingua'

// "Accedi" e "Registrati" ben visibili sopra il riquadro di Clerk: chi arriva la prima volta sa dove andare.
export function SchedeAccesso({ attiva, accedi, registrati }: { attiva: 'accedi' | 'registrati'; accedi: string; registrati: string }) {
  const t = useT()
  const scheda = (chi: 'accedi' | 'registrati', href: string, testo: string) => (
    <Link
      href={href}
      replace
      aria-current={attiva === chi ? 'page' : undefined}
      className={`flex-1 rounded-lg px-3 py-2 text-center text-sm font-semibold transition ${
        attiva === chi ? 'bg-white text-green-700 shadow dark:bg-zinc-800 dark:text-green-400' : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400'
      }`}
    >
      {testo}
    </Link>
  )
  return (
    <div className="flex w-full max-w-sm gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
      {scheda('accedi', accedi, t('Accedi'))}
      {scheda('registrati', registrati, t('Registrati'))}
    </div>
  )
}
