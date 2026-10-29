import { Suspense } from 'react'
import { displayName, mioInCima, overall, requirePlayer, type Player } from '@/lib/player'
import { getPlayers, getUpcomingMatches } from '@/lib/matches'
import { getT } from '@/lib/lingua'
import { ButtonLink, Card, Loading, PageTitle, PlayerRow } from '@/components/ui'
import { SwipeRiga } from '@/components/swipe-riga'
import { convocaGiocatore, rimuoviDallaLega } from '@/app/actions'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { formaDellaLega, legaPro } from '@/lib/pro'

export default function GiocatoriPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Rosa />
    </Suspense>
  )
}

async function Rosa() {
  const me = await requirePlayer()
  const [players, prossime, pro] = await Promise.all([
    getPlayers(me.lega._id),
    me.isAdmin ? getUpcomingMatches(me.lega._id) : [],
    legaPro(me.lega._id),
  ])
  const t = await getT()
  // Pro: forma di ognuno (freccia accanto al voto) e, per gli organizzatori, le proposte di nuovi voti
  const analisi = pro ? await formaDellaLega(me.lega._id) : null
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
      label: t('Elimina'),
      confirm: t('Togliere {nome} dalla rosa e dalla lega? Esce anche dalle partite non ancora giocate.', { nome: displayName(p) }),
    }
    const convoca = prossima &&
      p.attivo !== false &&
      !giaInLista.has(p._id) && {
        azione: convocaGiocatore.bind(null, prossima._id, p._id),
        label: (
          <span className="text-center leading-tight">
            {t('Convoca')}
            <span className="block text-[11px] font-normal capitalize">{t.data(prossima.data, { weekday: 'short', day: 'numeric' })}</span>
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
      <PageTitle
        action={
          me.isAdmin && (
            <span className="flex gap-2">
              <ButtonLink href="/giocatori/importa" variant="secondary" title={t('Importa giocatori da Excel o CSV')}>
                📥 {t('Importa')}
              </ButtonLink>
              <ButtonLink href="/giocatori/nuovo">+ {t('Giocatore')}</ButtonLink>
            </span>
          )
        }
      >
        {t('Rosa')} <span className="text-base font-normal text-zinc-500">({attivi.length})</span>
      </PageTitle>
      {me.isAdmin && analisi && analisi.proposte.length > 0 && (
        <Link
          href="/giocatori/proposte"
          className="mb-4 flex items-center justify-between gap-2 rounded-xl bg-green-50 p-3 text-sm font-medium text-green-900 hover:bg-green-100 dark:bg-green-950 dark:text-green-200 dark:hover:bg-green-900"
        >
          <span>
            📈 {t.n(analisi.proposte.length, '{n} proposta di aggiornamento dei voti', '{n} proposte di aggiornamento dei voti')}
          </span>
          <span aria-hidden>›</span>
        </Link>
      )}
      {me.isAdmin && !pro && (
        <p className="mb-4 rounded-xl bg-zinc-50 p-3 text-xs text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-300">
          <span className="mr-1 rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-zinc-900">PRO</span>
          {t('Forma dei giocatori (↑↓ accanto al voto), formazioni che ne tengono conto e proposte automatiche per aggiornare i voti ogni 5 partite.')}{' '}
          <Link href="/pro" className="font-semibold text-green-700 hover:underline dark:text-green-400">
            {t('Scopri il Pro ›')}
          </Link>
        </p>
      )}
      <Card>
        <ul className="space-y-3">
          {mioInCima(attivi, me._id, (p) => p._id).map((p) => (
            <li key={p._id}>
              {riga(
                p,
                <PlayerRow
                  player={p}
                  mio={p._id === me._id}
                  forma={analisi?.forma.get(p._id)}
                  mostraAccesso
                  // ruolo a sinistra del voto, così i voti restano allineati a destra
                  organizzatore={!!p.isAdmin}
                  prima={!p.isAdmin && p.puoInserireRisultati && <span title={t('Può inserire i risultati')}>📝</span>}
                />,
              )}
            </li>
          ))}
        </ul>
      </Card>
      {inattivi.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 font-semibold text-zinc-500">{t('Non attivi')}</h2>
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
