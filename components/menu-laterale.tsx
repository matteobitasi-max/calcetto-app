'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SEZIONI, sezioneAttiva } from './sezioni'
import { useT } from './lingua'

const ICONE: Record<string, string> = { '/': '🏠', '/calendario': '📅', '/classifica': '📊', '/giocatori': '👥' }

// Computer (schermi larghi): il menu a sinistra al posto delle pillole in alto.
// Sotto le sezioni, gli strumenti di chi organizza (e del Club) a un clic.
export function MenuLaterale({ organizzatore, club }: { organizzatore: boolean; club: boolean }) {
  const pathname = usePathname()
  const t = useT()
  const voce = (attiva: boolean) =>
    `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
      attiva ? 'bg-green-600 text-white shadow-sm' : 'text-zinc-700 hover:bg-white hover:shadow-sm dark:text-zinc-200 dark:hover:bg-zinc-800'
    }`
  const strumenti: [string, string, string][] = [
    ...(organizzatore
      ? ([
          ['/partite/nuova', '➕', t('Nuova partita')],
          ['/tornei', '🏆', t('Tornei')],
          ['/giocatori/importa', '📥', t('Importa giocatori')],
          ['/calendario/importa', '🗓️', t('Importa un calendario')],
          ['/lega', '⚙️', t('Impostazioni lega')],
        ] as [string, string, string][])
      : ([['/tornei', '🏆', t('Tornei')]] as [string, string, string][])),
    club ? ['/club', '🧢', t('Club PRO')] : ['/pro', '⭐', 'The Cap Pro'],
  ]
  return (
    <nav aria-label={t('Menu')} className="space-y-6">
      <div className="space-y-1">
        {SEZIONI.map((s) => {
          const attiva = sezioneAttiva(s, pathname)
          return (
            <Link key={s.href} href={s.href} aria-current={attiva ? 'page' : undefined} className={voce(attiva)}>
              <span className="text-base">{ICONE[s.href]}</span>
              {t(s.label)}
            </Link>
          )
        })}
      </div>
      <div className="space-y-1">
        <p className="px-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{organizzatore ? t('Strumenti') : t('Altro')}</p>
        {strumenti.map(([href, icona, label]) => {
          const attiva = pathname === href || (href !== '/' && pathname.startsWith(`${href}/`))
          return (
            <Link key={href} href={href} aria-current={attiva ? 'page' : undefined} className={voce(attiva)}>
              <span className="text-base">{icona}</span>
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
