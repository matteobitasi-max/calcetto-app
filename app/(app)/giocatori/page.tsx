import { Suspense } from 'react'
import { displayName, mioInCima, overall, requirePlayer, type Player } from '@/lib/player'
import { getPlayers, getUpcomingMatches } from '@/lib/matches'
import { formatData } from '@/lib/dates'
import { ButtonLink, Card, IconaOrganizzatore, Loading, PageTitle, PlayerRow } from '@/components/ui'
import { SwipeRiga } from '@/components/swipe-riga'
import { convocaGiocatore, rimuoviDallaLega } from '@/app/actions'
import type { ReactNode } from 'react'

export default function GiocatoriPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Rosa />
    </Suspense>
  )
}

async function Rosa() {
  const me = await requirePlayer()
  const [players, prossime] = await Promise.all([getPlayers(me.lega._id), me.isAdmin ? getUpcomingMatches(me.lega._id) : []])
  // la prossima partita (non di un torneo) in cui l'organizzatore può convocare chi non si è ancora convocato
  const prossima = prossime.find((m) => !m.torneo)
  const giaInLista = new Set(prossima?.convocazioni.filter((c) => c.risposta !== 'assente').map((c) => c.giocatore?._id))
  const attivi = players.filter((p) => p.attivo !== false).sort((a, b) => overall(b) - overall(a))
  // chi è stato tolto dalla lega non compare più nemmeno tra i non attivi
  const inattivi = players.filter((p) => p.attivo === false && !p.rimosso)
  // Organizzatore: swipe a sinistra toglie il giocatore dalla lega (non sé stesso),
  // swipe a destra lo convoca alla prossima partita (se non è già in lista).
  const riga = (p: Player, contenuto: ReactNode) => {
    if (!me.isAdmin) return contenuto
    const elimina = p._id !== me._id && {
      azione: rimuoviDallaLega.bind(null, p._id),
      label: 'Elimina',
      confirm: `Togliere ${displayName(p)} dalla rosa e dalla lega? Esce anche dalle partite non ancora giocate.`,
    }
    const convoca = prossima &&
      p.attivo !== false &&
      !giaInLista.has(p._id) && {
        azione: convocaGiocatore.bind(null, prossima._id, p._id),
        label: (
          <span className="text-center leading-tight">
            Convoca
            <span className="block text-[11px] font-normal capitalize">{formatData(prossima.data, { weekday: 'short', day: 'numeric' })}</span>
          </span>
        ),
      }
    if (!elimina && !convoca) return contenuto
    return (
      <SwipeRiga sinistra={elimina || undefined} destra={convoca || undefined}>
        {contenuto}
      </SwipeRiga>
    )
  }

  return (
    <>
      <PageTitle action={me.isAdmin && <ButtonLink href="/giocatori/nuovo">+ Giocatore</ButtonLink>}>
        Rosa <span className="text-base font-normal text-zinc-500">({attivi.length})</span>
      </PageTitle>
      <Card>
        <ul className="space-y-3">
          {mioInCima(attivi, me._id, (p) => p._id).map((p) => (
            <li key={p._id}>
              {riga(
                p,
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
                />,
              )}
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
                  {riga(p, <PlayerRow player={p} mostraAccesso />)}
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </>
  )
}
