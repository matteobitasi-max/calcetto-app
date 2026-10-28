import { getPlayers } from '@/lib/matches'
import { displayName } from '@/lib/roster'
import { intervistato, intervisteDellaPlaylist, linkPlaylist } from '@/lib/interviste'
import { getT } from '@/lib/lingua'
import { StrisciaInterviste } from './interviste'

const GIORNI_DOPO_LA_PARTITA = 4

// Le interviste della playlist YouTube della lega: tutte (home), quelle uscite nei giorni dopo
// una partita (pagina della partita) o quelle in cui compare un giocatore (profilo).
export async function IntervisteLega({
  legaId,
  playlist,
  partita,
  giocatore,
}: {
  legaId: string
  playlist?: string
  partita?: string
  giocatore?: string
}) {
  if (!playlist) return null
  const [tutte, rosa, t] = await Promise.all([intervisteDellaPlaylist(playlist).catch(() => null), getPlayers(legaId), getT()])
  if (!tutte?.length) return null

  const video = tutte
    .map((v) => ({ ...v, chi: intervistato(v.titolo, rosa) }))
    .filter((v) => {
      if (giocatore) return v.chi?._id === giocatore
      if (partita) {
        const giorni = (new Date(v.pubblicata).getTime() - new Date(partita).getTime()) / 86_400_000
        return giorni >= 0 && giorni <= GIORNI_DOPO_LA_PARTITA
      }
      return true
    })
  if (!video.length) return null

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">🎤 {t('Interviste')}</h2>
        {!partita && !giocatore && (
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
