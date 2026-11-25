import { Suspense } from 'react'
import { aggiungiFotoSorpresa, rigeneraInvito, rimuoviFotoSorpresa, riapriUltimaStagione, salvaInterviste, salvaLega, salvaPagamentiLega, terminaStagione } from '@/app/actions'
import Link from 'next/link'
import { sanity } from '@/lib/sanity'
import { nomeProposto, periodoInCorso, stagioniOrdinate, type Stagione as StagioneLega } from '@/lib/stagioni'
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
import { Card, Field, Loading, PageTitle, buttonClass, inputClass } from '@/components/ui'
import { TipoLega } from '@/components/tipo-lega'
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

      <TipoLega lega={lega} />

      <Suspense>
        <Stagione legaId={lega._id} stagioni={lega.stagioni} />
      </Suspense>

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

// La stagione: si chiude con un nome (es. 2025/26) e ne inizia una nuova. Niente si cancella: classifica,
// statistiche e rosa ripartono da zero e le stagioni chiuse restano nelle Statistiche.
async function Stagione({ legaId, stagioni }: { legaId: string; stagioni?: StagioneLega[] }) {
  const t = await getT()
  const { dal } = periodoInCorso(stagioni)
  // l'inizio della stagione in corso: la fine della precedente o la prima partita della lega
  const inizio =
    dal ?? (await sanity.fetch<string | null>(`*[_type == "match" && lega._ref == $legaId] | order(data asc)[0].data`, { legaId }).catch(() => null)) ?? undefined
  const chiuse = stagioniOrdinate(stagioni)
  const giorno = (iso: string) => t.data(iso, { day: 'numeric', month: 'short', year: 'numeric' })
  return (
    <Card className="space-y-3">
      <div>
        <h2 className="font-semibold">🏁 {t('Stagione')}</h2>
        <p className="text-sm text-zinc-500">
          {t('Quando la stagione finisce, terminala: viene salvata con il suo nome e classifica, statistiche e rosa ripartono da zero. Le partite non si cancellano e le stagioni passate restano nelle Statistiche.')}
        </p>
      </div>
      <p className="text-sm">
        <b>{t('Stagione in corso')}</b> · {inizio ? t('dal {data}', { data: giorno(inizio) }) : t('nessuna partita ancora')}
      </p>
      <ActionForm action={terminaStagione.bind(null, legaId)} className="flex flex-wrap items-end gap-2">
        <Field label={t('Nome della stagione')}>
          <input name="nome" required maxLength={30} defaultValue={nomeProposto(inizio, new Date().toISOString())} className={`${inputClass} w-40`} />
        </Field>
        <SubmitButton
          className={buttonClass('danger')}
          confirm={t('Terminare la stagione? Classifica, statistiche e rosa ripartono da zero; la stagione resta consultabile nelle Statistiche.')}
        >
          {t('Termina stagione')}
        </SubmitButton>
      </ActionForm>
      {chiuse.length > 0 && (
        <div className="space-y-1 border-t border-zinc-200 pt-3 dark:border-zinc-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t('Stagioni passate')}</p>
          {chiuse.map((s, i) => (
            <div key={s._key} className="flex items-center justify-between gap-2 text-sm">
              <Link href={`/classifica?stagione=${s._key}`} className="min-w-0 truncate hover:underline">
                <b>{s.nome}</b>
                <span className="text-zinc-500">
                  {' '}
                  · {s.dal ? `${giorno(s.dal)} – ` : `${t('fino al')} `}
                  {giorno(s.al)}
                </span>
              </Link>
              <Link href={`/wrap/${s._key}`} className="shrink-0 text-xs font-semibold text-violet-700 hover:underline dark:text-violet-400">
                🎁 Wrap
              </Link>
              {/* solo l'ultima si può riaprire (se è stata chiusa per sbaglio) */}
              {i === 0 && (
                <form action={riapriUltimaStagione.bind(null, legaId)}>
                  <SubmitButton className="text-xs text-red-600 hover:underline" confirm={t('Riaprire la stagione {nome}? Le sue partite tornano nella stagione in corso.', { nome: s.nome })}>
                    {t('Riapri')}
                  </SubmitButton>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
