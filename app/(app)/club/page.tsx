import Link from 'next/link'
import { Suspense } from 'react'
import { scegliClub } from '@/app/actions'
import { getUtente, requireIn, requirePlayer } from '@/lib/player'
import { chiaviRevenueCat, mioClub, pagamentiConfigurati } from '@/lib/abbonamenti'
import { MAX_LEGHE_CLUB } from '@/lib/entitlement'
import { sanity } from '@/lib/sanity'
import { AttivaPro } from '@/components/attiva-pro'
import { SubmitButton } from '@/components/submit-button'
import { Card, Loading, buttonClass } from '@/components/ui'
import { EtichettaClub } from '@/components/pill-scelta'
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
  // le leghe in cui il mio Club è già acceso: oltre MAX_LEGHE_CLUB non si può accendere in un'altra
  const mieClub = mio && utente ? await sanity.fetch<{ _id: string; nome: string }[]>(`*[_type == "league" && club == true && clubDi == $u]{_id, nome}`, { u: utente.id }) : []
  const pieno = !!legaId && !mieClub.some((l) => l._id === legaId) && mieClub.length >= MAX_LEGHE_CLUB

  // le funzioni del Club, con la spunta (come nella pagina Pro): titolo e una riga di spiegazione
  const ora = [
    [t('Convocati scelti dall’allenatore'), t('Solo loro ricevono l’avviso e possono confermare.')],
    [t('Infortunati e squalificati'), t('Con la data di rientro: non si possono convocare.')],
    [t('Pagelle a fine partita'), t('Voto e nota a ogni giocatore, con la media nel profilo.')],
    [t('Formazione con modulo e ruoli'), t('Dal calcio a 5 al calcio a 11: 4-4-2, 3-5-2, 4-3-3 e gli altri, con i titolari proposti.')],
    [t('Presenze agli allenamenti'), t('Quante volte ognuno si è allenato, in percentuale.')],
    [t('Regole della squadra'), t('Scegli tu se i giocatori possono convocarsi da soli.')],
  ]
  const presto = [t('Staff: vice, preparatore, dirigente'), t('Dati dalle telecamere Veo')]

  return (
    <div className="space-y-4">
      <Card className="space-y-2 border-2 border-zinc-900 text-center dark:border-white">
        <div className="flex justify-center">
          <EtichettaClub />
        </div>
        <h1 className="text-2xl font-bold">{t('Club PRO')}</h1>
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t('Club Allenatore')}</p>
        <p className="text-sm text-zinc-500">{t('Per squadre con allenatore e società: decidi tu chi convocare e segui ogni giocatore.')}</p>
      </Card>

      <Card className="space-y-3">
        <p className="text-sm font-semibold">{t('Tutto il Pro, più:')}</p>
        <ul className="space-y-2.5">
          {ora.map(([titolo, testo]) => (
            <li key={titolo} className="flex gap-2.5">
              <span className="font-bold text-green-600">✓</span>
              <span>
                <span className="block text-sm font-semibold">{titolo}</span>
                <span className="block text-xs text-zinc-500">{testo}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="border-t border-zinc-200 pt-3 dark:border-zinc-800">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">{t('In arrivo nel Club')}</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">{presto.join(' · ')}</p>
        </div>
      </Card>

      <Card className="space-y-3 border-green-600">
        {pieno ? (
          <div className="space-y-2 text-sm">
            <p className="font-medium">✅ {t('Hai il Club Allenatore.')}</p>
            <p>{t('Il Club PRO vale in {n} leghe ed è già attivo in:', { n: MAX_LEGHE_CLUB })}</p>
            <ul className="list-inside list-disc font-semibold">
              {mieClub.map((l) => (
                <li key={l._id}>{l.nome}</li>
              ))}
            </ul>
            <p className="text-zinc-500">{t('Per spostarlo qui, apri una di quelle leghe e in Impostazioni lega → Tipo di lega scegli “Tra amici”.')}</p>
          </div>
        ) : mio && legaId ? (
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
