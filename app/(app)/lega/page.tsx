import { Suspense } from 'react'
import { rigeneraInvito, salvaLega, salvaPagamentiLega } from '@/app/actions'
import { requireAdmin } from '@/lib/player'
import { avatarUrl, immagineUrl } from '@/lib/image'
import { baseUrl } from '@/lib/url'
import { ActionForm } from '@/components/action-form'
import { InvitoLink } from '@/components/invito-link'
import { PhotoInput } from '@/components/photo-input'
import { SatispaySetup } from '@/components/satispay-setup'
import { SubmitButton } from '@/components/submit-button'
import { Card, Field, Loading, PageTitle, buttonClass, inputClass } from '@/components/ui'

export default function LegaPage() {
  return (
    <>
      <PageTitle>Impostazioni lega</PageTitle>
      <Suspense fallback={<Loading />}>
        <Impostazioni />
      </Suspense>
    </>
  )
}

async function Impostazioni() {
  const admin = await requireAdmin()
  const { lega } = admin
  const url = `${await baseUrl()}/invito/${lega.codiceInvito}`

  return (
    <div className="space-y-4">
      <Card>
        <ActionForm action={salvaLega.bind(null, lega._id)} className="space-y-4">
          <h2 className="font-semibold">Nome e logo</h2>
          <div className="space-y-1 text-sm">
            <span className="font-medium">Logo</span>
            {/* stesso caricamento delle foto profilo, campo "logo" */}
            <PhotoInput currentUrl={avatarUrl(lega.logo, 160)} name="logo" />
          </div>
          <Field label="Nome della lega">
            <input name="nome" required minLength={2} maxLength={40} defaultValue={lega.nome} className={inputClass} />
          </Field>
          <SubmitButton className={buttonClass('primary')} pendingText="Salvo…">
            Salva
          </SubmitButton>
        </ActionForm>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">📨 Invita giocatori</h2>
        <p className="text-sm text-zinc-500">Chi apre il link e fa l&apos;accesso entra subito nella rosa. Poi puoi assegnargli caratteristiche e permessi.</p>
        <InvitoLink url={url} nomeLega={lega.nome} />
        <p className="text-sm">
          Codice: <b className="font-mono tracking-widest">{lega.codiceInvito}</b>
        </p>
        <form action={rigeneraInvito.bind(null, lega._id)}>
          <SubmitButton
            className="text-sm text-red-600 hover:underline"
            confirm="Cambiare codice? I link d'invito già mandati smetteranno di funzionare."
          >
            Cambia codice (invalida i vecchi link)
          </SubmitButton>
        </form>
      </Card>

      <Card>
        <ActionForm action={salvaPagamentiLega.bind(null, lega._id)} className="space-y-4">
          <div>
            <h2 className="font-semibold">💶 Pagamenti con Satispay</h2>
            <p className="text-sm text-zinc-500">Le quote delle partite arrivano a chi riceve su questo Satispay.</p>
          </div>
          <SatispaySetup link={lega.satispayLink} qrUrl={immagineUrl(lega.satispayQr, 400)} />
          <SubmitButton className={buttonClass('primary')} pendingText="Salvo…">
            Salva pagamenti
          </SubmitButton>
        </ActionForm>
      </Card>
    </div>
  )
}
