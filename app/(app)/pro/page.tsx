import Link from 'next/link'
import { Suspense } from 'react'
import { getUtente, requirePlayer } from '@/lib/player'
import { chiaviRevenueCat, mioAbbonamento, pagamentiConfigurati } from '@/lib/abbonamenti'
import { AttivaPro } from '@/components/attiva-pro'
import { ChiusuraPro, Confronto, Domande, Garanzie, PianoPro, SezioneClub, StatoLega, Testata, Vantaggi } from '@/components/vetrina-pro'
import { MAX_LEGHE_PRO, ioPro, legaPro, oltreLimitePro } from '@/lib/pro'
import { getPlayers } from '@/lib/matches'
import { Card, Loading } from '@/components/ui'
import { getT } from '@/lib/lingua'

export default function ProPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Vetrina />
    </Suspense>
  )
}

// La pagina Pro: per chi non ce l'ha è una vetrina (vantaggi, confronto, prezzi, domande);
// per chi ce l'ha, il suo abbonamento e le scorciatoie alle funzioni.
async function Vetrina() {
  const [me, t, utente] = await Promise.all([requirePlayer(), getT(), getUtente()])
  const [attiva, mio, mioPro, rosa, oltre] = await Promise.all([
    legaPro(me.lega._id),
    utente ? mioAbbonamento(utente.id) : null,
    me.isAdmin ? ioPro(me.lega._id) : false,
    getPlayers(me.lega._id),
    me.isAdmin ? oltreLimitePro(me.lega._id) : false,
  ])
  const giocatori = rosa.filter((p) => p.attivo !== false).length
  const lega = me.lega.nome
  const vendibile = !!utente && pagamentiConfigurati()

  // Già abbonato: il suo abbonamento in cima, poi cosa ha
  if (mio && utente) {
    return (
      <div className="space-y-4">
        <Testata
          t={t}
          titolo={mio.piano === 'club' ? t('Grazie per essere Club PRO!') : t('Grazie per essere Pro!')}
          sotto={t('Tutte le funzioni Pro sono attive nelle tue leghe (fino a {n}).', { n: MAX_LEGHE_PRO })}
        />
        {oltre && (
          // questa lega è oltre quelle coperte dall'abbonamento
          <Card className="space-y-2 border-amber-400 bg-amber-50 dark:bg-amber-950/40">
            <p className="font-semibold">🏟️ {t('Gestisci tante leghe?')}</p>
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              {t('Il tuo Pro vale nelle prime {n} leghe che organizzi: {lega} è oltre questo limite. Per centri sportivi, scuole calcio e chi organizza tante leghe stiamo preparando il piano Club.', { n: MAX_LEGHE_PRO, lega })}
            </p>
            <Link href="/supporto" className="inline-block text-sm font-semibold text-green-700 hover:underline dark:text-green-400">
              {t('Scrivici per il piano Club ›')}
            </Link>
          </Card>
        )}
        <Card className="space-y-3 border-green-600 bg-green-50 dark:bg-green-950">
          <AttivaPro utente={utente.id} chiavi={chiaviRevenueCat()} mio={mio} giocatori={giocatori} piano={mio.piano === 'club' ? 'club' : 'pro'} />
        </Card>
        <Vantaggi t={t} link />
        <SezioneClub t={t} legaId={me.isAdmin ? me.lega._id : undefined} />
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-20">
      <Testata
        t={t}
        titolo={t('Porta la tua lega a un altro livello')}
        sotto={
          me.isAdmin
            ? t('Tornei veri, la forma di ogni giocatore e squadre sempre equilibrate. Lo paghi solo tu: i {n} giocatori di {lega} lo usano gratis.', { n: giocatori, lega })
            : t('Tornei veri, la forma di ogni giocatore e squadre sempre equilibrate, nelle leghe che organizzi. Lo paghi solo tu: i tuoi giocatori lo usano gratis.')
        }
        cta={vendibile}
      />

      <StatoLega t={t} attiva={attiva} admin={!!me.isAdmin} mioPro={mioPro} lega={lega} vendibile={vendibile} />

      {/* 1. i due piani, uno sotto l'altro: Pro (con i prezzi) e Club PRO */}
      <section id="prezzi" className="scroll-mt-28 space-y-3">
        <h2 className="text-center text-lg font-bold">{t('Scegli il tuo piano')}</h2>
        <PianoPro t={t}>{vendibile && <AttivaPro utente={utente!.id} chiavi={chiaviRevenueCat()} mio={null} giocatori={giocatori} />}</PianoPro>
        <SezioneClub t={t} legaId={me.isAdmin ? me.lega._id : undefined} />
        {vendibile && <Garanzie t={t} />}
      </section>

      {/* 2. le differenze tra i piani */}
      <section className="space-y-3">
        <h2 className="text-center text-lg font-bold">{t('Le differenze')}</h2>
        <Confronto t={t} />
      </section>

      {/* 3. le funzioni nel dettaglio */}
      <section className="space-y-3">
        <h2 className="text-center text-lg font-bold">{t('Le funzioni nel dettaglio')}</h2>
        <Vantaggi t={t} link={attiva} />
      </section>

      <Domande t={t} />

      {vendibile && <ChiusuraPro t={t} />}
    </div>
  )
}

