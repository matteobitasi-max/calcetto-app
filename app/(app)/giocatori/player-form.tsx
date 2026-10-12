import type { FormState } from '@/app/actions'
import { PIEDI, RUOLI, SKILLS, SKILL_DESCRIPTIONS, type Player, type Skill } from '@/lib/player'
import { avatarUrl } from '@/lib/image'
import { ActionForm } from '@/components/action-form'
import { PhotoInput } from '@/components/photo-input'
import { RatingInput } from '@/components/rating-input'
import { SubmitButton } from '@/components/submit-button'
import { Card, Field, buttonClass, inputClass } from '@/components/ui'

export function PlayerForm({
  action,
  player,
  submitLabel,
  limited = false,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>
  player?: Player
  submitLabel: string
  /** Solo foto e caratteristiche, per chi non è organizzatore. */
  limited?: boolean
}) {
  return (
    <ActionForm action={action} className="space-y-4">
      <Card className="space-y-4">
        <PhotoInput currentUrl={avatarUrl(player?.foto, 160)} />
        {!limited && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nome">
                <input name="nome" required defaultValue={player?.nome} className={inputClass} />
              </Field>
              <Field label="Cognome">
                <input name="cognome" defaultValue={player?.cognome} className={inputClass} />
              </Field>
            </div>
            <Field label="Soprannome">
              <input name="soprannome" defaultValue={player?.soprannome} className={inputClass} />
            </Field>
            <Field label="Email (quella con cui farà l'accesso)">
              <input name="email" type="email" required defaultValue={player?.email} className={inputClass} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Ruolo">
                <select name="ruolo" defaultValue={player?.ruolo ?? ''} className={`${inputClass} capitalize`}>
                  <option value="">—</option>
                  {RUOLI.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Piede">
                <select name="piede" defaultValue={player?.piede ?? ''} className={`${inputClass} capitalize`}>
                  <option value="">—</option>
                  {PIEDI.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="attivo" defaultChecked={player?.attivo !== false} className="accent-green-600" />
                Attivo
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="isAdmin" defaultChecked={!!player?.isAdmin} className="accent-green-600" />
                Organizzatore
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="puoModificareGiocatori"
                  defaultChecked={!!player?.puoModificareGiocatori}
                  className="accent-green-600"
                />
                Può modificare caratteristiche e foto
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="puoInserireRisultati"
                  defaultChecked={!!player?.puoInserireRisultati}
                  className="accent-green-600"
                />
                Può inserire i risultati
              </label>
            </div>
          </>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">Caratteristiche (1–10)</h2>
        {(Object.entries(SKILLS) as [Skill, string][]).map(([key, label]) => (
          <RatingInput key={key} name={key} label={label} hint={SKILL_DESCRIPTIONS[key]} defaultValue={player?.caratteristiche?.[key] ?? 5} />
        ))}
      </Card>

      <SubmitButton className={buttonClass('primary')} pendingText="Salvo…">
        {submitLabel}
      </SubmitButton>
    </ActionForm>
  )
}
