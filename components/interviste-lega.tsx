import { getPlayers } from '@/lib/matches'
import { displayName } from '@/lib/roster'
import { intervistato, intervisteDellaPlaylist, linkPlaylist } from '@/lib/interviste'
import { getT } from '@/lib/lingua'
import { StrisciaInterviste } from './interviste'

// Le interviste della playlist YouTube della lega: tutte (home) o quelle in cui compare un giocatore (profilo).
export async function IntervisteLega({
  legaId,
  playlist,
  giocatore,
}: {
  legaId: string
  playlist?: string
  giocatore?: string
}) {
  if (!playlist) return null
  const [tutte, rosa, t] = await Promise.all([intervisteDellaPlaylist(playlist).catch(() => null), getPlayers(legaId), getT()])
  if (!tutte?.length) return null

  const video = tutte
    .map((v) => ({ ...v, chi: intervistato(v.titolo, rosa) }))
    .filter((v) => {
      if (giocatore) return v.chi?._id === giocatore
      return true
    })
  if (!video.length) return null

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">🎤 {t('Interviste')}</h2>
        {!giocatore && (
          <a href={linkPlaylist(playlist)} target="_blank" rel="noreferrer" className="text-sm text-green-700 hover:underline dark:text-green-400">
            {t('Tutte')} ›
          </a>
        )}
      </div>
      <StrisciaInterviste
        video={video.map((v) => ({
          id: v.id,
          titolo: v.titolo,
          verticale: v.verticale,
          sotto: [v.chi && !giocatore ? displayName(v.chi) : null, v.pubblicata && t.data(v.pubblicata, { day: 'numeric', month: 'short' })]
            .filter(Boolean)
            .join(' · '),
        }))}
      />
    </section>
  )
}
