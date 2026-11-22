import Link from 'next/link'
import { Suspense } from 'react'
import { scegliClub } from '@/app/actions'
import { getUtente, requireIn, requirePlayer } from '@/lib/player'
import { chiaviRevenueCat, mioClub, pagamentiConfigurati } from '@/lib/abbonamenti'
import { AttivaPro } from '@/components/attiva-pro'
import { SubmitButton } from '@/components/submit-button'
import { Card, Loading, buttonClass } from '@/components/ui'
import { getT } from '@/lib/lingua'

export default function ClubPage({ searchParams }: PageProps<'/club'>) {
  return (
    <Suspense fallback={<Loading />}>
      <Vetrina searchParams={searchParams} />
    </Suspense>
  )
}

// Club Allenatore: cosa offre e l'abbonamento. Arriva qui chi sceglie "Club Allenatore" nel tipo di lega
// senza avere ancora il Club; dopo l'acquisto il Club si accende in quella lega.
async function Vetrina({ searchParams }: { searchParams: PageProps<'/club'>['searchParams'] }) {
  const [{ lega }, me, utente, t] = await Promise.all([searchParams, requirePlayer(), getUtente(), getT()])
  // la lega in cui accendere il Club: quella indicata (se la organizzo) o quella attiva
  const legaId = typeof lega === 'string' && lega ? (await requireIn(lega, 'organizzatore')).lega._id : me.isAdmin ? me.lega._id : undefined
  const mio = utente ? await mioClub(utente.id) : null

  const ora = [
    ['📋', t('Convocati scelti dall’allenatore'), t('Solo loro ricevono l’avviso e possono confermare.')],
    ['🚑', t('Infortunati e squalificati'), t('Con la data di rientro: non si possono convocare.')],
    ['📝', t('Pagelle a fine partita'), t('Voto e nota a ogni giocatore, con la media nel profilo.')],
    ['⚙️', t('Regole della squadra'), t('Scegli tu se i giocatori possono convocarsi da soli.')],
    ['⭐', t('Tutto il Pro incluso'), t('Tornei, forma dei giocatori e statistiche dei km.')],
  ]
  const presto = [t('Presenze agli allenamenti'), t('Formazione con modulo e ruoli'), t('Staff: vice, preparatore, dirigente'), t('Dati dalle telecamere Veo')]

  return (
    <div className="space-y-4">
      <Card className="space-y-2 border-2 border-zinc-900 text-center dark:border-white">
        <p className="text-4xl">🧢</p>
        <h1 className="text-2xl font-bold">{t('Club Allenatore')}</h1>
        <p className="text-sm text-zinc-500">{t('Per squadre con allenatore e società: decidi tu chi convocare e segui ogni giocatore.')}</p>
      </Card>

      <Card className="space-y-3">
        {ora.map(([emoji, titolo, testo]) => (
          <div key={titolo} className="flex gap-3">
            <span className="text-xl">{emoji}</span>
            <span>
              <span className="block font-semibold">{titolo}</span>
              <span className="block text-sm text-zinc-500">{testo}</span>
            </span>
          </div>
        ))}
        <div className="border-t border-zinc-200 pt-3 dark:border-zinc-800">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">{t('In arrivo nel Club')}</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">{presto.join(' · ')}</p>
        </div>
      </Card>

      <Card className="space-y-3 border-green-600">
        {mio && legaId ? (
          <>
            <p className="font-medium">✅ {t('Hai il Club Allenatore.')}</p>
            <form action={scegliClub.bind(null, legaId)}>
              <SubmitButton className={`${buttonClass('primary')} w-full justify-center py-3`}>{t('Attiva il Club in {lega}', { lega: me.lega._id === legaId ? me.lega.nome : t('questa lega') })}</SubmitButton>
            </form>
          </>
        ) : utente && pagamentiConfigurati() ? (
          <AttivaPro utente={utente.id} chiavi={chiaviRevenueCat()} mio={mio} piano="club" legaId={legaId} />
        ) : (
          <p className="text-sm text-zinc-500">{t('Il Club non è ancora disponibile negli store: scrivici per provarlo.')}</p>
        )}
        <Link href="/supporto" className="block text-center text-sm font-medium text-green-700 hover:underline dark:text-green-400">
          {t('Domande sul Club? Scrivici ›')}
        </Link>
      </Card>

      <Link href="/lega" className="block text-center text-sm text-zinc-500 hover:underline">
        ← {t('Torna alle impostazioni della lega')}
      </Link>
    </div>
  )
}
