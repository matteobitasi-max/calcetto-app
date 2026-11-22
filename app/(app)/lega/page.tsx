import { Suspense } from 'react'
import { aggiungiFotoSorpresa, rigeneraInvito, salvaOpzioneSquadra, salvaTipoLega, scegliClub, rimuoviFotoSorpresa, salvaInterviste, salvaLega, salvaPagamentiLega } from '@/app/actions'
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

      {/* Tipo di lega: tra amici o Club Allenatore (a pagamento: senza Club attivo porta al pagamento) */}
      <Card className="space-y-3">
        <h2 className="font-semibold">🧢 {t('Tipo di lega')}</h2>
        <div className="grid gap-2">
          {(
            [
              ['amici', '👥', t('Tra amici'), t('Chi risponde per primo gioca, con la lista d’attesa.'), salvaTipoLega.bind(null, lega._id, 'amici')],
              ['club', '🧢', t('Club Allenatore'), t('Convocati scelti dall’allenatore, infortunati e squalificati, pagelle a fine partita. Include tutto il Pro.'), scegliClub.bind(null, lega._id)],
            ] as const
          ).map(([valore, emoji, titolo, testo, azione]) => {
            const scelto = valore === 'club' ? !!lega.club && lega.tipo === 'squadra' : !(lega.club && lega.tipo === 'squadra')
            return (
              <form key={valore} action={azione}>
                <SubmitButton
                  className={`flex w-full items-start gap-3 rounded-xl border-2 p-3 text-left ${scelto ? 'border-green-600 bg-green-50 dark:bg-green-950' : 'border-zinc-200 dark:border-zinc-700'}`}
                >
                  <span className="text-2xl">{emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 font-semibold">
                      {titolo}
                      {valore === 'club' && <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-bold text-white dark:bg-white dark:text-zinc-900">CLUB</span>}
                    </span>
                    <span className="block text-sm text-zinc-500">{testo}</span>
                  </span>
                  {scelto && <span className="text-green-600">✓</span>}
                </SubmitButton>
              </form>
            )
          })}
          {lega.club &&
            lega.tipo === 'squadra' &&
            (
              [
                ['autoconvocazione', !!lega.autoconvocazione, t('I giocatori possono convocarsi da soli'), t('Sì: ognuno può dire “ci sono”, come tra amici. No: risponde solo chi convochi tu.')],
                ['pagelle', lega.pagelle !== false, t('Pagelle a fine partita, con note'), t('Voto da 1 a 10 a chi era in lista. Il voto lo vedono tutti, la nota solo il giocatore e gli organizzatori.')],
              ] as const
            ).map(([opzione, attiva, titolo, testo]) => (
              <form key={opzione} action={salvaOpzioneSquadra.bind(null, lega._id, opzione, !attiva)} className="flex items-center gap-3 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-950">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{titolo}</span>
                  <span className="block text-xs text-zinc-500">{testo}</span>
                </span>
                <SubmitButton
                  aria-pressed={attiva}
                  aria-label={titolo}
                  className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${attiva ? 'bg-green-600 text-white' : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'}`}
                >
                  {attiva ? t('Sì') : t('No')}
                </SubmitButton>
              </form>
            ))}
        </div>
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
