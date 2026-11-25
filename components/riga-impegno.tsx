import Link from 'next/link'
import type { ReactNode } from 'react'
import { isAllenamento, type Match } from '@/lib/matches'
import type { T } from '@/lib/i18n'
import { StatoBadge } from './ui'

// Un impegno in un elenco (calendario, "Nelle altre leghe"): in alto a sinistra se è una partita o un
// allenamento, in alto a destra lo stato delle convocazioni; sotto la lega e, in grassetto, quando.
export function RigaImpegno({ match, lega, quando, dettagli, t }: { match: Match; lega?: ReactNode; quando: string; dettagli?: string; t: T }) {
  const allenamento = isAllenamento(match)
  return (
    <Link href={`/partite/${match._id}`} className="block space-y-1 px-4 py-3 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800">
      <span className="flex items-center justify-between gap-2">
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
            allenamento ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300' : 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
          }`}
        >
          {allenamento ? `🏃 ${t('Allenamento')}` : `⚽ ${t('Partita')}`}
        </span>
        <StatoBadge match={match} />
      </span>
      {lega && <span className="flex min-w-0">{lega}</span>}
      <span className="block truncate text-xs text-zinc-500">
        <b className="font-semibold capitalize text-zinc-800 dark:text-zinc-200">{quando}</b>
        {dettagli && ` · ${dettagli}`}
      </span>
    </Link>
  )
}
