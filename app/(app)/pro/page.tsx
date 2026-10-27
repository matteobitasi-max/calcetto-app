import Link from 'next/link'
import { Suspense, type ReactNode } from 'react'
import { LogoC } from '@/components/logo-c'
import { getUtente, requirePlayer } from '@/lib/player'
import { chiaviRevenueCat, mioAbbonamento, pagamentiConfigurati } from '@/lib/abbonamenti'
import { AttivaPro } from '@/components/attiva-pro'
import { legaPro } from '@/lib/pro'
import { ButtonLink, Card, Loading, PageTitle } from '@/components/ui'
import { getT } from '@/lib/lingua'

export default function ProPage() {
  return (
    <>
      <PageTitle>
        The Cap <span className="ml-1 rounded-full bg-amber-400 px-2.5 py-0.5 align-middle text-xs font-bold text-zinc-900">PRO</span>
      </PageTitle>
      <Suspense fallback={<Loading />}>
        <Vetrina />
      </Suspense>
    </>
  )
}

const FUNZIONI: { titolo: string; voci: [ReactNode, string][]; link?: [string, string] }[] = [
  {
    titolo: '🏆 Tornei',
    voci: [
      ['🔁', 'Girone all’italiana, tabellone a eliminazione diretta o gironi + tabellone'],
      ['🗓️', 'Calendario e turni successivi creati da soli con i risultati'],
      ['👕', 'Squadre con nome, foto e capitano, che invita i compagni con un link'],
      ['📊', 'Classifiche, tabellone e marcatori sempre aggiornati'],
    ],
    link: ['/tornei', 'I miei tornei'],
  },
  {
    titolo: '📈 Forma e voti dei giocatori',
    voci: [
      ['↑↓', 'Forma di ogni giocatore, aggiornata a ogni risultato (freccia accanto al voto)'],
      ['⚖️', 'Formazioni automatiche che tengono conto di chi è in forma'],
      ['🗳️', 'Ogni 5 partite, proposte per aggiornare i voti da gol, MVP, km e risultati: l’organizzatore approva o scarta'],
    ],
    link: ['/giocatori', 'Vai alla rosa'],
  },
  {
    titolo: '👤 Il tuo abbonamento',
    voci: [
      [<LogoC key="c" size={18} />, 'La C di The Cap accanto al tuo nome, in tutte le leghe'],
      ['👑', 'Tutte le funzioni Pro nelle leghe che organizzi'],
    ],
  },
  {
    titolo: '🔜 In arrivo',
    voci: [
      ['👍', 'Voti tra compagni dopo la partita'],
      ['📊', 'Statistiche avanzate dei giocatori e della lega'],
    ],
  },
]

// Cosa comprende la versione Pro, e se è attiva nella lega in cui sono.
async function Vetrina() {
  const [me, t, utente] = await Promise.all([requirePlayer(), getT(), getUtente()])
  const [attiva, mio] = await Promise.all([legaPro(me.lega._id), utente ? mioAbbonamento(utente.id) : null])
  return (
    <div className="space-y-4">
      {utente && pagamentiConfigurati() ? (
        <Card className={`space-y-3 ${mio ? 'border-green-600 bg-green-50 dark:bg-green-950' : 'border-amber-400'}`}>
          {!mio && (
            <p className="text-sm">
              {me.isAdmin
                ? t('Con Pro, {lega} e tutte le leghe che organizzi hanno le funzioni qui sotto. Lo paghi solo tu: i giocatori le usano gratis.', { lega: me.lega.nome })
                : t('Con Pro, le leghe che organizzi hanno le funzioni qui sotto. Lo paghi solo tu: i giocatori le usano gratis.')}
            </p>
          )}
          <AttivaPro utente={utente.id} chiavi={chiaviRevenueCat()} mio={mio} />
        </Card>
      ) : null}
      <Card className={attiva ? 'border-green-600 bg-green-50 dark:bg-green-950' : ''}>
        {attiva ? (
          <p className="text-sm font-medium text-green-900 dark:text-green-200">
            ✅ {t('La versione Pro è attiva in {lega}: tutto quello che vedi qui sotto è già disponibile.', { lega: me.lega.nome })}
          </p>
        ) : pagamentiConfigurati() ? (
          <p className="text-sm">
            {me.isAdmin
              ? t('In {lega} la versione Pro non è ancora attiva.', { lega: me.lega.nome })
              : t('In {lega} la versione Pro non è attiva: la attiva un organizzatore della lega con il suo abbonamento.', { lega: me.lega.nome })}
          </p>
        ) : (
          <p className="text-sm">
            {t('In {lega} la versione Pro non è ancora attiva. Arriverà presto: se vuoi provarla con la tua lega,', { lega: me.lega.nome })}{' '}
            <Link href="/supporto" className="font-semibold text-green-700 hover:underline dark:text-green-400">
              {t('scrivici')}
            </Link>
            .
          </p>
        )}
      </Card>
      {FUNZIONI.map((f) => (
        <Card key={f.titolo} className="space-y-3">
          <h2 className="font-semibold">{t(f.titolo)}</h2>
          <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
            {f.voci.map(([icona, testo]) => (
              <li key={testo} className="flex gap-2">
                <span className="flex w-6 shrink-0 justify-center">{icona}</span>
                <span>{t(testo)}</span>
              </li>
            ))}
          </ul>
          {attiva && f.link && (
            <ButtonLink href={f.link[0]} variant="secondary">
              {t(f.link[1])} ›
            </ButtonLink>
          )}
        </Card>
      ))}
    </div>
  )
}
