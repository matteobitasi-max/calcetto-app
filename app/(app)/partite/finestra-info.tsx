import { formatData } from '@/lib/dates'
import { finestra, type Match } from '@/lib/matches'
import { Countdown } from '@/components/countdown'

const breve = { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' } as const

export function FinestraInfo({ match }: { match: Match }) {
  switch (finestra(match)) {
    case 'non_ancora':
      return (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          🕒 Convocazioni aprono tra <Countdown target={match.aperturaConvocazioni} />
          <span className="block text-xs text-zinc-500">{formatData(match.aperturaConvocazioni, breve)}</span>
        </p>
      )
    case 'aperta':
      return (
        <p className="text-sm text-green-700 dark:text-green-400">
          ✅ Convocazioni aperte · chiudono tra <Countdown target={match.chiusuraConvocazioni} />
          <span className="block text-xs opacity-80">entro {formatData(match.chiusuraConvocazioni, breve)}</span>
        </p>
      )
    case 'scaduta':
      return <p className="text-sm text-amber-700 dark:text-amber-400">⏳ Tempo scaduto, in attesa delle squadre</p>
    case 'chiusa':
      return match.stato === 'chiusa' ? (
        <p className="text-sm text-blue-700 dark:text-blue-400">🔒 Convocazioni chiuse{match.squadraA.length > 0 && ' · squadre pronte'}</p>
      ) : null
  }
}
