import type { FormState } from '@/app/actions'
import { BADGE, PIEDI, RUOLI, SKILLS, SKILL_DESCRIPTIONS, type Player, type Skill } from '@/lib/player'
import { avatarUrl } from '@/lib/image'
import { ActionForm } from '@/components/action-form'
import { PhotoInput } from '@/components/photo-input'
import { PillSalva } from '@/components/pill-salva'
import { RatingInput } from '@/components/rating-input'
import { SubmitButton } from '@/components/submit-button'
import { Card, Field, buttonClass, inputClass } from '@/components/ui'
import { getT } from '@/lib/lingua'

export async function PlayerForm({
  action,
  player,
  submitLabel,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>
  player?: Player
  submitLabel: string
}) {
  const t = await getT()
  return (
    <ActionForm action={action} className="space-y-4">
      {/* la versione della scheda da cui parte la modifica: se nel frattempo è cambiata, non si sovrascrive */}
      {player?._rev && <input type="hidden" name="rev" value={player._rev} />}
      <Card className="space-y-4">
        <PhotoInput currentUrl={avatarUrl(player?.foto, 160)} />
        <Field label={t('Badge (si vede accanto al nome)')}>
          <select name="badge" defaultValue={player?.badge ?? ''} className={inputClass}>
            <option value="">{t('Nessuno')}</option>
            {Object.entries(BADGE).map(([value, b]) => (
              <option key={value} value={value}>
                {b.emoji} {t(b.label)}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('Nome')}>
            <input name="nome" required defaultValue={player?.nome} className={inputClass} />
          </Field>
          <Field label={t('Cognome')}>
            <input name="cognome" defaultValue={player?.cognome} className={inputClass} />
          </Field>
        </div>
        <Field label={t('Soprannome')}>
          <input name="soprannome" defaultValue={player?.soprannome} className={inputClass} />
        </Field>
        <div className="space-y-1">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email">
              <input name="email" type="email" defaultValue={player?.email} placeholder="mario@gmail.com" className={inputClass} />
            </Field>
            <Field label={t('oppure Telefono')}>
              <input name="telefono" type="tel" inputMode="tel" defaultValue={player?.telefono} placeholder="333 1234567" className={inputClass} />
            </Field>
          </div>
          <p className="text-xs text-zinc-500">{t('Basta uno dei due: quando fa l’accesso con quell’email o quel numero, la scheda si collega da sola.')}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('Ruolo')}>
            <select name="ruolo" defaultValue={player?.ruolo ?? ''} className={`${inputClass} capitalize`}>
              <option value="">—</option>
              {RUOLI.map((r) => (
                <option key={r} value={r}>
                  {t(r)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('Piede')}>
            <select name="piede" defaultValue={player?.piede ?? ''} className={`${inputClass} capitalize`}>
              <option value="">—</option>
              {PIEDI.map((p) => (
                <option key={p} value={p}>
                  {t(p)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="attivo" defaultChecked={player?.attivo !== false} className="accent-green-600" />
            {t('Attivo')}
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="isAdmin" defaultChecked={!!player?.isAdmin} className="accent-green-600" />
            {t('Organizzatore')}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="puoInserireRisultati"
              defaultChecked={!!player?.puoInserireRisultati}
              className="accent-green-600"
            />
            {t('Può inserire i risultati')}
          </label>
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">{t('Caratteristiche (1–10)')}</h2>
        {(Object.entries(SKILLS) as [Skill, string][]).map(([key, label]) => (
          <RatingInput key={key} name={key} label={t(label)} hint={t(SKILL_DESCRIPTIONS[key])} defaultValue={player?.caratteristiche?.[key] ?? 5} />
        ))}
      </Card>

      {/* Modifica: la pillola "Salva" compare quando cambi qualcosa. Nuovo giocatore: pulsante in fondo. */}
      {player ? (
        <PillSalva label={submitLabel} />
      ) : (
        <SubmitButton className={buttonClass('primary')} pendingText={t('Salvo…')}>
          {submitLabel}
        </SubmitButton>
      )}
    </ActionForm>
  )
}
