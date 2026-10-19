import { Suspense } from 'react'
import { mioInCima, overall, requirePlayer } from '@/lib/player'
import { getPlayers } from '@/lib/matches'
import { ButtonLink, Card, IconaOrganizzatore, Loading, PageTitle, PlayerRow } from '@/components/ui'

export default function GiocatoriPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Rosa />
    </Suspense>
  )
}

async function Rosa() {
  const me = await requirePlayer()
  const players = await getPlayers(me.lega._id)
  const attivi = players.filter((p) => p.attivo !== false).sort((a, b) => overall(b) - overall(a))
  const inattivi = players.filter((p) => p.attivo === false)

  return (
    <>
      <PageTitle action={me.isAdmin && <ButtonLink href="/giocatori/nuovo">+ Giocatore</ButtonLink>}>
        Rosa <span className="text-base font-normal text-zinc-500">({attivi.length})</span>
      </PageTitle>
      <Card>
        <ul className="space-y-3">
          {mioInCima(attivi, me._id, (p) => p._id).map((p) => (
            <li key={p._id}>
              <PlayerRow
                player={p}
                mio={p._id === me._id}
                mostraAccesso
                // ruolo a sinistra del voto, così i voti restano allineati a destra
                prima={
                  p.isAdmin ? (
                    <IconaOrganizzatore />
                  ) : (
                    p.puoInserireRisultati && <span title="Può inserire i risultati">📝</span>
                  )
                }
              />
            </li>
          ))}
        </ul>
      </Card>
      {inattivi.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 font-semibold text-zinc-500">Non attivi</h2>
          <Card className="opacity-70">
            <ul className="space-y-3">
              {inattivi.map((p) => (
                <li key={p._id}>
                  <PlayerRow player={p} mostraAccesso />
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </>
  )
}
