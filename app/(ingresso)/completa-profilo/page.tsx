import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { saltaProfilo, salvaAccount } from '@/app/actions'
import { getMemberships, getUtente } from '@/lib/player'
import { ActionForm } from '@/components/action-form'
import { CampiProfilo } from '@/components/campi-profilo'
import { SubmitButton } from '@/components/submit-button'
import { Card, Loading, buttonClass } from '@/components/ui'
import { getT } from '@/lib/lingua'

// Al primo accesso: foto, nome, ruolo, piede e data di nascita, prima di entrare (una volta sola).
export default function CompletaProfiloPage({ searchParams }: PageProps<'/completa-profilo'>) {
  return (
    <Suspense fallback={<Loading />}>
      <Completa searchParams={searchParams} />
    </Suspense>
  )
}

async function Completa({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [utente, leghe, t, { dopo }] = await Promise.all([getUtente(), getMemberships(), getT(), searchParams])
  if (!utente) redirect('/sign-in')
  const vai = typeof dopo === 'string' && dopo.startsWith('/') && !dopo.startsWith('//') ? dopo : '/'

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">{t('Completa il tuo profilo')}</h1>
        <p className="mt-1 text-sm text-zinc-500">{t('Così gli organizzatori ti conoscono e fanno squadre equilibrate. Puoi cambiarli quando vuoi in “Il mio account”.')}</p>
      </div>
      <ActionForm action={salvaAccount} className="space-y-4">
        <input type="hidden" name="dopo" value={vai} />
        <Card className="space-y-4">
          <CampiProfilo utente={utente} scheda={leghe[0]} />
        </Card>
        <SubmitButton className={`${buttonClass('primary')} w-full justify-center`} pendingText={t('Salvo…')}>
          {t('Continua')}
        </SubmitButton>
      </ActionForm>
      <form action={saltaProfilo.bind(null, vai)} className="text-center">
        <SubmitButton className="text-sm text-zinc-500 hover:underline" pendingText="…">
          {t('Salta per ora')}
        </SubmitButton>
      </form>
    </div>
  )
}
