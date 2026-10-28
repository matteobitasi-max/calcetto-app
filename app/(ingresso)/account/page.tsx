import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { SignOutButton } from '@clerk/nextjs'
import { salvaAccount } from '@/app/actions'
import { getMemberships, getUtente } from '@/lib/player'
import { CampiProfilo } from '@/components/campi-profilo'
import { ActionForm } from '@/components/action-form'
import { EliminaAccount } from '@/components/elimina-account'
import { PillSalva } from '@/components/pill-salva'
import { StravaAccount } from '@/components/strava-account'
import { getCollegamento, stravaConfigurato } from '@/lib/strava'
import { Card, Field, Loading, buttonClass, inputClass } from '@/components/ui'
import { ScegliLingua } from '@/components/scegli-lingua'
import { getT } from '@/lib/lingua'

// "Il mio account": dati personali (che finiscono in tutte le mie schede giocatore),
// privacy e contatti, uscita ed eliminazione dell'account.
export default function AccountPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Account />
    </Suspense>
  )
}

async function Account() {
  const [utente, leghe, t] = await Promise.all([getUtente(), getMemberships(), getT()])
  if (!utente) redirect('/sign-in')
  const strava = stravaConfigurato() ? await getCollegamento(utente.id) : null
  const scheda = leghe[0]

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">{t('Il mio account')}</h1>
        <p className="mt-1 text-sm text-zinc-500">{t('Questi dati compaiono nella tua scheda giocatore, in tutte le tue leghe.')}</p>
      </div>

      <ActionForm action={salvaAccount} className="space-y-4">
        <Card className="space-y-4">
          <CampiProfilo utente={utente} scheda={scheda} />
          <Field label="Email">
            <input value={utente.emails[0] ?? '—'} readOnly disabled className={`${inputClass} text-zinc-500`} />
          </Field>
        </Card>
        <PillSalva />
      </ActionForm>

      <Card className="space-y-3">
        <h2 className="font-semibold">🌍 {t('Lingua')}</h2>
        <ScegliLingua />
      </Card>

      <Card className="divide-y divide-zinc-100 p-0! empty:hidden dark:divide-zinc-800">
        {stravaConfigurato() && <StravaAccount collegato={!!strava} atleta={strava?.atleta} />}
      </Card>

      <Card className="divide-y divide-zinc-100 p-0! text-sm dark:divide-zinc-800">
        <Link href="/privacy" className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800">
          🔒 {t('Privacy policy')} <span className="text-zinc-400">›</span>
        </Link>
        <Link href="/supporto" className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800">
          💬 {t('Supporto e contatti')} <span className="text-zinc-400">›</span>
        </Link>
      </Card>

      <SignOutButton redirectUrl="/sign-in">
        <button className={`${buttonClass('secondary')} w-full`}>{t('Esci')}</button>
      </SignOutButton>
      <EliminaAccount />

      <Link href={leghe.length ? '/' : '/benvenuto'} className="block text-center text-sm text-green-700 hover:underline dark:text-green-400">
        ← {leghe.length ? t('Torna all’app') : t('Torna alle leghe')}
      </Link>
    </div>
  )
}
