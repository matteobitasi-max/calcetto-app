import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { chiudiIscrizioni, eliminaTorneo, invitoTorneo, salvaTorneo } from '@/app/actions'
import { requireIn } from '@/lib/player'
import { getTorneo, iscrizioniAperte, puoCreareTornei } from '@/lib/tornei'
import { baseUrl } from '@/lib/url'
import { ActionForm } from '@/components/action-form'
import { CodiceInvito, InvitoLink } from '@/components/invito-link'
import { PillSalva } from '@/components/pill-salva'
import { SubmitButton } from '@/components/submit-button'
import { Card, Field, Loading, PageTitle, buttonClass, inputClass } from '@/components/ui'
import { getT } from '@/lib/lingua'

// Le impostazioni del torneo, come quelle della lega: dati del torneo, invito, squadre e iscrizioni.
export default async function ImpostazioniTorneoPage({ params }: PageProps<'/tornei/[id]/impostazioni'>) {
  const t = await getT()
  return (
    <>
      <PageTitle>{t('Impostazioni torneo')}</PageTitle>
      <Suspense fallback={<Loading />}>
        <Impostazioni params={params} />
      </Suspense>
    </>
  )
}

async function Impostazioni({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const torneo = await getTorneo(id)
  if (!torneo) notFound()
  const [, t] = await Promise.all([requireIn(torneo.legaId, 'organizzatore'), getT()])
  if (!(await puoCreareTornei(torneo.legaId))) notFound()
  const url = torneo.codiceInvito ? `${await baseUrl()}/invito-torneo/${torneo.codiceInvito}` : null
  const aperte = iscrizioniAperte(torneo)

  return (
    <div className="space-y-4">
      <Link href={`/tornei/${torneo._id}`} className="text-sm text-green-700 hover:underline dark:text-green-400">
        ← {torneo.nome}
      </Link>

      <Card>
        <ActionForm action={salvaTorneo.bind(null, torneo._id)} className="space-y-4">
          <Field label={t('Nome del torneo')}>
            <input name="nome" required minLength={2} maxLength={60} defaultValue={torneo.nome} className={inputClass} />
          </Field>
          <Field label={t('Campo / luogo')}>
            <input name="luogo" required maxLength={80} defaultValue={torneo.calendario?.luogo ?? ''} className={inputClass} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('Durata partita (minuti)')}>
              <input name="durataMinuti" type="number" inputMode="numeric" min={10} max={300} required defaultValue={torneo.calendario?.durataMinuti ?? 40} className={inputClass} />
            </Field>
            <Field label={t('Giocatori massimi per squadra')}>
              <input name="maxGiocatori" type="number" inputMode="numeric" min={1} max={50} defaultValue={torneo.maxGiocatori ?? ''} placeholder={t('Nessun limite')} className={inputClass} />
            </Field>
            {torneo.formato !== 'eliminazione' && (
              <>
                <Field label={t('Punti per vittoria')}>
                  <input name="puntiVittoria" type="number" inputMode="numeric" min={0} max={10} required defaultValue={torneo.puntiVittoria} className={inputClass} />
                </Field>
                <Field label={t('Punti per pareggio')}>
                  <input name="puntiPareggio" type="number" inputMode="numeric" min={0} max={10} required defaultValue={torneo.puntiPareggio} className={inputClass} />
                </Field>
              </>
            )}
          </div>
          <p className="text-xs text-zinc-500">
            {t('Campo e durata valgono anche per le partite non ancora giocate. Formato, numero di squadre e calendario non si cambiano dopo la creazione.')}
          </p>
          <PillSalva label={t('Salva torneo')} />
        </ActionForm>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">📨 {t('Invita al torneo')}</h2>
        <p className="text-sm text-zinc-500">{t('Chi apre il link entra nella lega (se serve) e sceglie in quale squadra giocare.')}</p>
        {url && torneo.codiceInvito ? (
          <>
            <InvitoLink url={url} nomeLega={torneo.nome} messaggio={`🏆 ${t('Gioca nel torneo “{torneo}” su The Cap:', { torneo: torneo.nome })}`} />
            <CodiceInvito codice={torneo.codiceInvito} />
            <form action={invitoTorneo.bind(null, torneo._id)}>
              <SubmitButton className="text-sm text-red-600 hover:underline" confirm={t('Cambiare codice? I link d’invito già mandati smetteranno di funzionare.')}>
                {t('Cambia codice (invalida i vecchi link)')}
              </SubmitButton>
            </form>
          </>
        ) : (
          <form action={invitoTorneo.bind(null, torneo._id)}>
            <SubmitButton className={buttonClass('primary')} pendingText="…">
              🔗 {t('Crea link e codice d’invito')}
            </SubmitButton>
          </form>
        )}
        {!aperte && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">{t('Le iscrizioni sono chiuse: con il link si vede il torneo, ma non si entra in una squadra.')}</p>}
      </Card>

      <Card className="divide-y divide-zinc-100 p-0! dark:divide-zinc-800">
        <Link href={`/tornei/${torneo._id}/squadre`} className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800">
          <span>
            <span className="block font-semibold">👥 {t('Squadre e giocatori')}</span>
            <span className="block text-sm text-zinc-500">{t('Nomi, capitani e chi gioca dove')}</span>
          </span>
          <span className="text-zinc-400">›</span>
        </Link>
        <form action={chiudiIscrizioni.bind(null, torneo._id, !torneo.iscrizioniChiuse)} className="flex items-center justify-between gap-3 px-4 py-3">
          <span>
            <span className="block font-semibold">{aperte ? `🔓 ${t('Iscrizioni aperte')}` : `🔒 ${t('Iscrizioni chiuse')}`}</span>
            <span className="block text-sm text-zinc-500">{t('Con le iscrizioni aperte i capitani invitano e cambiano la squadra (si chiudono comunque alla prima partita).')}</span>
          </span>
          <SubmitButton className={`${buttonClass('secondary')} shrink-0`} pendingText="…">
            {torneo.iscrizioniChiuse ? t('Riapri') : t('Chiudi')}
          </SubmitButton>
        </form>
      </Card>

      <form action={eliminaTorneo.bind(null, torneo._id)} className="pt-2 text-center">
        <SubmitButton
          className="text-sm text-red-600 hover:underline"
          pendingText={t('Elimino…')}
          confirm={t('Eliminare “{nome}” con tutte le sue partite, anche quelle già giocate?', { nome: torneo.nome })}
        >
          {t('Elimina il torneo')}
        </SubmitButton>
      </form>
    </div>
  )
}
