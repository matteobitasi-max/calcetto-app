import { Suspense } from 'react'
import { aggiungiFotoSorpresa, rigeneraInvito, rimuoviFotoSorpresa, salvaLega, salvaPagamentiLega } from '@/app/actions'
import { FotoSorpreseEditor } from '@/components/foto-sorprese'
import { isTitolare, requireAdmin } from '@/lib/player'
import { avatarUrl, immagineUrl } from '@/lib/image'
import { baseUrl } from '@/lib/url'
import { ActionForm } from '@/components/action-form'
import { CodiceInvito, InvitoLink } from '@/components/invito-link'
import { LegaNomeLogo } from '@/components/lega-nome-logo'
import { PillSalva } from '@/components/pill-salva'
import { SatispaySetup } from '@/components/satispay-setup'
import { SubmitButton } from '@/components/submit-button'
import { Card, Field, Loading, PageTitle, inputClass } from '@/components/ui'

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
  const titolare = await isTitolare()
  const url = `${await baseUrl()}/invito/${lega.codiceInvito}`

  return (
    <div className="space-y-4">
      <Card>
        <ActionForm action={salvaLega.bind(null, lega._id)} className="space-y-4">
          <LegaNomeLogo nomeIniziale={lega.nome} logoUrl={avatarUrl(lega.logo, 160)} />
          <Field label="Città (per il meteo delle partite)">
            <input name="citta" maxLength={60} defaultValue={lega.citta?.nome ?? ''} placeholder="Es. Milano" className={inputClass} />
          </Field>
          <PillSalva label="Salva nome e logo" />
        </ActionForm>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">📨 Invita giocatori</h2>
        <p className="text-sm text-zinc-500">
          Chi apre il link e fa l&apos;accesso entra subito nella rosa. Poi puoi assegnargli caratteristiche e permessi.
        </p>
        <InvitoLink url={url} nomeLega={lega.nome} />
        <CodiceInvito codice={lega.codiceInvito ?? ''} />
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
          <PillSalva label="Salva pagamenti" />
        </ActionForm>
      </Card>

      {titolare && (
        <Card>
          <h2 className="font-semibold">📳 Foto sorpresa</h2>
          <p className="mb-3 text-sm text-zinc-500">Quando qualcuno della lega scuote il telefono, compare a tutto schermo una di queste foto, a caso.</p>
          <FotoSorpreseEditor
            foto={lega.fotoSorprese.map((f) => ({ key: f._key, url: avatarUrl(f, 200)! }))}
            aggiungi={aggiungiFotoSorpresa.bind(null, lega._id)}
            rimuovi={rimuoviFotoSorpresa.bind(null, lega._id)}
          />
        </Card>
      )}
    </div>
  )
}
