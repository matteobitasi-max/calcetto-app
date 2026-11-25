import type { FormState } from '@/app/actions'
import { ActionForm } from '@/components/action-form'
import { PillSalva } from '@/components/pill-salva'
import { PostiInput } from '@/components/posti-input'
import { Card, Field, inputClass } from '@/components/ui'
import { adessoArrotondato, isoToRomeLocal, minutiTra } from '@/lib/dates'
import { campiUsati, type Match } from '@/lib/matches'
import { CampoInput } from '@/components/campo-input'
import { PrenotaCentro } from '@/components/prenota-centro'
import { ricercaCampiAttiva } from '@/lib/google-maps'
import { getCurrentPlayer } from '@/lib/player'
import { MAX_ALLENAMENTO } from '@/lib/limiti'
import { QuandoFields } from './quando-fields'
import { getT } from '@/lib/lingua'

export async function MatchForm({
  action,
  match,
  giorno,
  legaId,
  allenamento,
  submitLabel,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>
  match?: Match
  /** Giorno scelto dal calendario (AAAA-MM-GG) per una nuova partita. */
  giorno?: string
  /** Nuova partita: la lega in cui crearla (se non è quella attiva). */
  legaId?: string
  /** Allenamento: niente formati da partita (5 vs 5…), solo il numero massimo di posti. */
  allenamento?: boolean
  submitLabel: string
}) {
  const [t, me] = await Promise.all([getT(), getCurrentPlayer()])
  // i campi già usati dalla lega in cui si crea (o della partita che si modifica)
  const legaDeiCampi = match?.legaId ?? legaId ?? me?.lega._id
  const usati = legaDeiCampi ? await campiUsati(legaDeiCampi).catch(() => []) : []
  const giornoOk = giorno && /^\d{4}-\d{2}-\d{2}$/.test(giorno) ? giorno : undefined
  // Nuova partita: convocazioni da adesso (arrotondato ai 5 minuti) per 2 ore.
  const quando = match
    ? {
        data: isoToRomeLocal(match.data),
        apertura: isoToRomeLocal(match.aperturaConvocazioni),
        durata:
          match.durataFinestraMinuti ?? minutiTra(isoToRomeLocal(match.aperturaConvocazioni), isoToRomeLocal(match.chiusuraConvocazioni)),
      }
    : { data: giornoOk ? `${giornoOk}T20:30` : undefined, apertura: adessoArrotondato(), durata: 120 }

  return (
    <ActionForm action={action} className="space-y-4">
      {legaId && <input type="hidden" name="legaId" value={legaId} />}
      {allenamento && !match && <input type="hidden" name="tipo" value="allenamento" />}
      <Card>
        <QuandoFields {...quando} nuova={!match} />
      </Card>

      <Card className="space-y-4">
        <Field label={t('Campo / luogo')} group>
          <CampoInput defaultLuogo={match?.luogo} defaultCampo={match?.campo} usati={usati} ricerca={ricercaCampiAttiva()} />
        </Field>
        {/* nuova partita in un centro su The Cap: si prenota il campo da qui */}
        {!match && <PrenotaCentro />}
        {allenamento ? (
          <Field label={t('Posti')}>
            <p className="mb-1 text-xs text-zinc-500">{t('Raggiunto questo numero, chi si convoca va in lista d’attesa.')}</p>
            <input name="postiDisponibili" type="number" min={2} max={MAX_ALLENAMENTO} required defaultValue={match?.postiDisponibili ?? 16} className={inputClass} />
          </Field>
        ) : (
          <div className="space-y-1 text-sm">
            <span className="font-medium">{t('Giocatori in lista')}</span>
            <p className="text-zinc-500">{t('Raggiunto questo numero, chi si convoca va in lista d’attesa.')}</p>
            <PostiInput defaultValue={match?.postiDisponibili} defaultAutomatico={match ? !!match.postiAutomatici : true} />
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('Durata (minuti)')}>
            <input name="durataMinuti" type="number" min={10} max={300} step={5} required defaultValue={match?.durataMinuti ?? 60} className={inputClass} />
          </Field>
          <Field label={t('Quota a testa (€)')}>
            <input name="quota" type="number" min={0} step="0.5" defaultValue={match?.quota} className={inputClass} />
          </Field>
        </div>
        <Field label={t('Note')}>
          <textarea name="note" rows={3} defaultValue={match?.note} className={inputClass} />
        </Field>
      </Card>

      {/* Modifica: la pillola compare quando cambi qualcosa. Nuova partita: quando hai compilato tutto il necessario. */}
      <PillSalva label={submitLabel} quando={match ? 'modificato' : 'completo'} />
    </ActionForm>
  )
}
