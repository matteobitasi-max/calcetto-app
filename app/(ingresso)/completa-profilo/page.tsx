import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { salvaAccount } from '@/app/actions'
import { getMemberships, getUtente } from '@/lib/player'
import { ActionForm } from '@/components/action-form'
import { CampiProfilo } from '@/components/campi-profilo'
import { CampiConsensi } from '@/components/campi-consensi'
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
        <p className="mt-1 text-sm text-zinc-500">{t('Nome e cognome sono obbligatori: così i compagni ti riconoscono. Il resto aiuta a fare squadre equilibrate e puoi cambiarlo quando vuoi in “Il mio account”.')}</p>
      </div>
      <ActionForm action={salvaAccount} className="space-y-4">
        <input type="hidden" name="dopo" value={vai} />
        <Card className="space-y-4">
          <CampiProfilo utente={utente} scheda={leghe[0]} cognomeObbligatorio />
        </Card>
        <Card>
          <CampiConsensi consensi={utente.consensi} conTermini />
        </Card>
        <SubmitButton className={`${buttonClass('primary')} w-full justify-center`} pendingText={t('Salvo…')}>
          {t('Continua')}
        </SubmitButton>
      </ActionForm>
    </div>
  )
}
