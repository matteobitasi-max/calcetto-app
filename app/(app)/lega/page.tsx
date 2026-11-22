import { Suspense } from 'react'
import { aggiungiFotoSorpresa, attivaClub, rigeneraInvito, salvaTipoLega, rimuoviFotoSorpresa, salvaInterviste, salvaLega, salvaPagamentiLega } from '@/app/actions'
import { linkPlaylist } from '@/lib/interviste'
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
import { getT } from '@/lib/lingua'

export default async function LegaPage() {
  const t = await getT()
  return (
    <>
      <PageTitle>{t('Impostazioni lega')}</PageTitle>
      <Suspense fallback={<Loading />}>
        <Impostazioni />
      </Suspense>
    </>
  )
}

async function Impostazioni() {
  const admin = await requireAdmin()
  const { lega } = admin
  const [titolare, t] = await Promise.all([isTitolare(), getT()])
  const url = `${await baseUrl()}/invito/${lega.codiceInvito}`

  return (
    <div className="space-y-4">
      <Card>
        <ActionForm action={salvaLega.bind(null, lega._id)} className="space-y-4">
          <LegaNomeLogo nomeIniziale={lega.nome} logoUrl={avatarUrl(lega.logo, 160)} />
          <Field label={t('Città (per il meteo delle partite)')}>
            <input name="citta" maxLength={60} defaultValue={lega.citta?.nome ?? ''} placeholder={t('Es. Milano')} className={inputClass} />
          </Field>
          <PillSalva label={t('Salva nome e logo')} />
        </ActionForm>
      </Card>

      {/* Club: lega tra amici o squadra con allenatore. Per ora il Club lo accende il titolare, lega per lega. */}
      <Card className="space-y-3">
        <h2 className="flex items-center gap-2 font-semibold">
          🧢 {t('Tipo di lega')}
          <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-bold text-white dark:bg-white dark:text-zinc-900">CLUB</span>
        </h2>
        {lega.club ? (
          <div className="grid gap-2">
            {(
              [
                ['amici', '👥', t('Tra amici'), t('Chi risponde per primo gioca, con la lista d’attesa.')],
                ['squadra', '🧢', t('Squadra con allenatore'), t('L’allenatore sceglie i convocati delle partite e segna infortunati e squalificati.')],
              ] as const
            ).map(([valore, emoji, titolo, testo]) => {
              const scelto = (lega.tipo ?? 'amici') === valore
              return (
                <form key={valore} action={salvaTipoLega.bind(null, lega._id, valore)}>
                  <SubmitButton
                    className={`flex w-full items-start gap-3 rounded-xl border-2 p-3 text-left ${scelto ? 'border-green-600 bg-green-50 dark:bg-green-950' : 'border-zinc-200 dark:border-zinc-700'}`}
                  >
                    <span className="text-2xl">{emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{titolo}</span>
                      <span className="block text-sm text-zinc-500">{testo}</span>
                    </span>
                    {scelto && <span className="text-green-600">✓</span>}
                  </SubmitButton>
                </form>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">{t('Allenatori e società: convocati scelti dall’allenatore, infortunati e squalificati, formazione e dati da Veo. Il piano Club arriva presto: scrivici per provarlo.')}</p>
        )}
        {titolare && (
          <form action={attivaClub.bind(null, lega._id, !lega.club)}>
            <SubmitButton className="text-sm font-medium text-amber-700 hover:underline dark:text-amber-400">
              {lega.club ? t('Spegni il Club in questa lega (titolare)') : t('Accendi il Club in questa lega (titolare)')}
            </SubmitButton>
          </form>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">📨 {t('Invita giocatori')}</h2>
        <p className="text-sm text-zinc-500">{t('Chi apre il link e fa l’accesso entra subito nella rosa. Poi puoi assegnargli caratteristiche e permessi.')}</p>
        <InvitoLink url={url} nomeLega={lega.nome} />
        <CodiceInvito codice={lega.codiceInvito ?? ''} />
        <form action={rigeneraInvito.bind(null, lega._id)}>
          <SubmitButton
            className="text-sm text-red-600 hover:underline"
            confirm={t('Cambiare codice? I link d’invito già mandati smetteranno di funzionare.')}
          >
            {t('Cambia codice (invalida i vecchi link)')}
          </SubmitButton>
        </form>
      </Card>

      <Card>
        <ActionForm action={salvaPagamentiLega.bind(null, lega._id)} className="space-y-4">
          <div>
            <h2 className="font-semibold">💶 {t('Pagamenti con Satispay')}</h2>
            <p className="text-sm text-zinc-500">{t('Le quote delle partite arrivano a chi riceve su questo Satispay.')}</p>
          </div>
          <SatispaySetup link={lega.satispayLink} qrUrl={immagineUrl(lega.satispayQr, 400)} />
          <PillSalva label={t('Salva pagamenti')} />
        </ActionForm>
      </Card>

      <Card>
        <ActionForm action={salvaInterviste.bind(null, lega._id)} className="space-y-4">
          <div>
            <h2 className="font-semibold">🎤 {t('Interviste')}</h2>
            <p className="text-sm text-zinc-500">
              {t('Incolla il link di una playlist di YouTube: ogni video che aggiungi alla playlist compare da solo nell’app, in home, nella partita e nel profilo di chi è nominato nel titolo.')}
            </p>
          </div>
          <Field label={t('Link della playlist')}>
            <input
              name="playlist"
              type="url"
              defaultValue={lega.playlistInterviste ? linkPlaylist(lega.playlistInterviste) : ''}
              placeholder="https://www.youtube.com/playlist?list=…"
              className={inputClass}
            />
          </Field>
          <PillSalva label={t('Salva playlist')} />
        </ActionForm>
      </Card>

      {titolare && (
        <Card>
          <h2 className="font-semibold">📳 {t('Foto sorpresa')}</h2>
          <p className="mb-3 text-sm text-zinc-500">{t('Quando qualcuno della lega scuote il telefono, compare a tutto schermo una di queste foto, a caso.')}</p>
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
