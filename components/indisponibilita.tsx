import { salvaIndisponibilita } from '@/app/actions'
import { ActionForm } from './action-form'
import { SubmitButton } from './submit-button'
import { Card, buttonClass, inputClass } from './ui'
import { MOTIVI_INDISPONIBILE, type MotivoIndisponibile, type Player } from '@/lib/roster'
import { getT } from '@/lib/lingua'

// Leghe "Squadra": disponibilità del giocatore. L'allenatore la cambia; gli altri la vedono e basta.
export async function Indisponibilita({ player, modifica }: { player: Player; modifica: boolean }) {
  const t = await getT()
  const ora = player.indisponibile
  const stato = ora ? MOTIVI_INDISPONIBILE[ora.motivo] : null
  const fino = ora?.fino ? t.data(`${ora.fino}T12:00:00Z`, { day: 'numeric', month: 'long' }) : null
  if (!modifica && !ora) return null

  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">🩺 {t('Disponibilità')}</h2>
      <p className="text-sm">
        {stato ? (
          <>
            <span className="font-semibold text-red-700 dark:text-red-400">
              {stato.emoji} {t(stato.label)}
            </span>
            {fino ? ` · ${t('fino al {data}', { data: fino })}` : ` · ${t('finché l’allenatore non lo toglie')}`}
            {ora?.nota && <span className="block text-zinc-500">{ora.nota}</span>}
          </>
        ) : (
          <span className="font-semibold text-green-700 dark:text-green-400">✅ {t('Disponibile')}</span>
        )}
      </p>
      {modifica && (
        <ActionForm action={salvaIndisponibilita.bind(null, player._id)} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select name="motivo" defaultValue={ora?.motivo ?? ''} className={inputClass} aria-label={t('Disponibilità')}>
              <option value="">✅ {t('Disponibile')}</option>
              {(Object.keys(MOTIVI_INDISPONIBILE) as MotivoIndisponibile[]).map((m) => (
                <option key={m} value={m}>
                  {MOTIVI_INDISPONIBILE[m].emoji} {t(MOTIVI_INDISPONIBILE[m].label)}
                </option>
              ))}
            </select>
            <input name="fino" type="date" defaultValue={ora?.fino} aria-label={t('Fino al (compreso)')} className={inputClass} />
          </div>
          <input name="nota" maxLength={120} defaultValue={ora?.nota} placeholder={t('Nota (facoltativa), es. distorsione caviglia')} className={inputClass} />
          <p className="text-xs text-zinc-500">{t('Chi è indisponibile non può essere convocato né rispondere “ci sono”. Senza data resta indisponibile finché non lo togli.')}</p>
          <SubmitButton className={buttonClass('secondary')} pendingText={t('Salvo…')}>
            {t('Salva')}
          </SubmitButton>
        </ActionForm>
      )}
    </Card>
  )
}
