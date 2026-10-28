import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { salvaSerie } from '@/app/actions'
import { requireIn } from '@/lib/player'
import { contaFutureConRisposte, descriviSerie, getSeries } from '@/lib/series'
import { ActionForm } from '@/components/action-form'
import { PostiInput } from '@/components/posti-input'
import { DatePicker } from '@/components/date-picker'
import { DURATE_FINESTRA } from '@/lib/limiti'
import { SubmitButton } from '@/components/submit-button'
import { Card, Field, Loading, PageTitle, buttonClass, inputClass } from '@/components/ui'
import { getT } from '@/lib/lingua'

export default async function ModificaSeriePage({ params }: PageProps<'/partite/ricorrenti/[id]'>) {
  const t = await getT()
  return (
    <>
      <PageTitle>{t('Modifica partita ricorrente')}</PageTitle>
      <Suspense fallback={<Loading />}>
        <Form params={params} />
      </Suspense>
    </>
  )
}

async function Form({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [serie, conRisposte, t] = await Promise.all([getSeries(id), contaFutureConRisposte(id), getT()])
  if (!serie) notFound()
  await requireIn(serie.legaId, 'organizzatore')

  return (
    <ActionForm action={salvaSerie.bind(null, serie._id)} className="space-y-4">
      <Card className="space-y-4">
        <p className="text-sm font-medium capitalize">{descriviSerie(serie, t).quando}</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('Ora')}>
            <input name="ora" type="time" required defaultValue={serie.ora} className={inputClass} />
          </Field>
          <Field label={t('Ogni')}>
            <select name="ogniSettimane" defaultValue={String(serie.ogniSettimane ?? 1)} className={inputClass}>
              <option value="1">{t('settimana')}</option>
              <option value="2">{t('2 settimane')}</option>
            </select>
          </Field>
        </div>
        <Field label={t('Fino al (facoltativo)')} group>
          <DatePicker name="fineData" defaultValue={serie.fineData} min={serie.primaData} placeholder={t('Nessuna fine')} />
        </Field>
        <Field label={t('Campo / luogo')}>
          <input name="luogo" required defaultValue={serie.luogo} className={inputClass} />
        </Field>
        <div className="space-y-1 text-sm">
          <span className="font-medium">{t('Giocatori in lista')}</span>
          <PostiInput defaultValue={serie.postiDisponibili} defaultAutomatico={!!serie.postiAutomatici} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('Durata (minuti)')}>
            <input name="durataMinuti" type="number" min={10} max={300} step={5} required defaultValue={serie.durataMinuti ?? 60} className={inputClass} />
          </Field>
          <Field label={t('Quota a testa (€)')}>
            <input name="quota" type="number" min={0} step="0.5" defaultValue={serie.quota} className={inputClass} />
          </Field>
        </div>
        <Field label={t('Note')}>
          <textarea name="note" rows={3} defaultValue={serie.note} className={inputClass} />
        </Field>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold">{t('Finestra convocazioni')}</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('Inizio: giorni prima')}>
            <input name="aperturaGiorniPrima" type="number" min={0} required defaultValue={serie.aperturaGiorniPrima} className={inputClass} />
          </Field>
          <Field label={t('alle')}>
            <input name="aperturaOra" type="time" required defaultValue={serie.aperturaOra} className={inputClass} />
          </Field>
        </div>
        <Field label={t('Durata')}>
          <select name="durataFinestraMinuti" defaultValue={serie.durataFinestraMinuti ?? 120} className={inputClass}>
            {DURATE_FINESTRA.map(([m, label]) => (
              <option key={m} value={m}>
                {t(label)}
              </option>
            ))}
          </select>
        </Field>
      </Card>

      <p className="text-sm text-zinc-500">
        {t('Le modifiche valgono per le prossime partite ancora senza risposte.')}
        {conRisposte > 0 &&
          ` ${t.n(conRisposte, 'Una partita ha già delle risposte e non cambierà: modificala dalla sua pagina.', '{n} partite hanno già delle risposte e non cambieranno: modificale dalla loro pagina.')}`}
      </p>

      <SubmitButton className={buttonClass('primary')} pendingText={t('Salvo…')}>
        {t('Salva')}
      </SubmitButton>
    </ActionForm>
  )
}
