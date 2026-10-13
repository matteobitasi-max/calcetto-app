import { displayName, type Player } from '@/lib/player'
import type { Match } from '@/lib/matches'

// Risultato con i marcatori sotto ogni squadra e l'MVP.
export function Tabellino({ match }: { match: Match }) {
  const tutti = new Map([...match.squadraA, ...match.squadraB].map((p) => [p._id, p]))
  const marcatori = (squadra: Player[], autogol?: number) => [
    ...match.marcatori
      .filter((m) => squadra.some((p) => p._id === m.giocatoreId))
      .map((m) => `${displayName(tutti.get(m.giocatoreId)!)}${m.gol > 1 ? ` ×${m.gol}` : ''}`),
    ...(autogol ? [`autogol${autogol > 1 ? ` ×${autogol}` : ''}`] : []),
  ]
  const mvp = match.mvpId ? tutti.get(match.mvpId) : undefined
  return (
    <div className="space-y-2 pt-2">
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3 text-center">
        <p className="text-xs text-zinc-500">{marcatori(match.squadraA, match.autogolA).join(', ')}</p>
        <p className="text-3xl font-bold tabular-nums">
          {match.risultato?.golA} – {match.risultato?.golB}
        </p>
        <p className="text-xs text-zinc-500">{marcatori(match.squadraB, match.autogolB).join(', ')}</p>
      </div>
      {mvp && (
        <p className="text-center text-sm">
          🫑 MVP: <b>{displayName(mvp)}</b>
        </p>
      )}
    </div>
  )
}
