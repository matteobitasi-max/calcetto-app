import type { FormState } from '@/app/actions'
import { ActionForm } from '@/components/action-form'
import { PostiInput } from '@/components/posti-input'
import { SubmitButton } from '@/components/submit-button'
import { Card, Field, buttonClass, inputClass } from '@/components/ui'
import { addDays, isoToRomeLocal } from '@/lib/dates'
import type { Match } from '@/lib/matches'
import { QuandoFields } from './quando-fields'

export function MatchForm({
  action,
  match,
  giorno,
  submitLabel,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>
  match?: Match
  /** Giorno scelto dal calendario (AAAA-MM-GG) per una nuova partita. */
  giorno?: string
  submitLabel: string
}) {
  const giornoOk = giorno && /^\d{4}-\d{2}-\d{2}$/.test(giorno) ? giorno : undefined
  const quando = match
    ? {
        data: isoToRomeLocal(match.data),
        apertura: isoToRomeLocal(match.aperturaConvocazioni),
        chiusura: isoToRomeLocal(match.chiusuraConvocazioni),
      }
    : giornoOk
      ? { data: `${giornoOk}T20:30`, apertura: `${addDays(giornoOk, -3)}T09:00`, chiusura: `${giornoOk}T12:00` }
      : {}

  return (
    <ActionForm action={action} className="space-y-4">
      <Card>
        <QuandoFields {...quando} nuova={!match} />
      </Card>

      <Card className="space-y-4">
        <Field label="Campo / luogo">
          <input name="luogo" required placeholder="Centro sportivo…" defaultValue={match?.luogo} className={inputClass} />
        </Field>
        <div className="space-y-1 text-sm">
          <span className="font-medium">Giocatori in lista</span>
          <p className="text-zinc-500">Raggiunto questo numero, chi si convoca va in lista d&apos;attesa.</p>
          <PostiInput defaultValue={match?.postiDisponibili} defaultAutomatico={match ? !!match.postiAutomatici : true} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Durata (minuti)">
            <input name="durataMinuti" type="number" min={10} max={300} step={5} required defaultValue={match?.durataMinuti ?? 60} className={inputClass} />
          </Field>
          <Field label="Quota a testa (€)">
            <input name="quota" type="number" min={0} step="0.5" defaultValue={match?.quota} className={inputClass} />
          </Field>
        </div>
        <Field label="Note">
          <textarea name="note" rows={3} defaultValue={match?.note} className={inputClass} />
        </Field>
      </Card>

      <SubmitButton className={buttonClass('primary')} pendingText="Salvo…">
        {submitLabel}
      </SubmitButton>
    </ActionForm>
  )
}
