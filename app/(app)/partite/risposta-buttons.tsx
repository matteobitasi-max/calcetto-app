import { rispondi } from '@/app/actions'
import { SubmitButton } from '@/components/submit-button'
import { RispostaBadge, buttonClass } from '@/components/ui'
import { conSelezione, finestra, ordinati, type Match } from '@/lib/matches'
import { getT } from '@/lib/lingua'

// La mia risposta e, se la finestra è aperta, i pulsanti per cambiarla.
export async function RispostaButtons({ match, playerId, indisponibile }: { match: Match; playerId: string; indisponibile?: boolean }) {
  const t = await getT()
  const current = match.convocazioni.find((c) => c.giocatore?._id === playerId)?.risposta
  const aperta = finestra(match) === 'aperta'
  // leghe "Squadra": rispondono solo i convocati dall'allenatore, e non chi è indisponibile
  const nonConvocato = conSelezione(match) && !(match.convocati ?? []).includes(playerId)
  if (!current && (nonConvocato || indisponibile) && match.stato !== 'giocata' && match.stato !== 'annullata') {
    return (
      <p className="text-sm text-zinc-500">
        {indisponibile
          ? `🩺 ${t('Sei segnato come indisponibile per questa partita.')}`
          : (match.convocati ?? []).length
            ? `📋 ${t('Non sei tra i convocati di questa partita.')}`
            : `📋 ${t('L’allenatore non ha ancora scelto i convocati')}`}
      </p>
    )
  }
  if (!aperta && !current) return null

  const going = current === 'presente' || current === 'riserva'
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-sm">
        {t('Tu:')} <RispostaBadge risposta={current} />
        {current === 'riserva' && (
          <span className="ml-1 text-zinc-500">
            {t('{n}° in lista d’attesa', { n: ordinati(match, 'riserva').findIndex((c) => c.giocatore._id === playerId) + 1 })}
          </span>
        )}
      </span>
      {aperta && (
        <div className="flex gap-2">
          {!going && !indisponibile && !nonConvocato && (
            <form action={rispondi.bind(null, match._id, 'presente')}>
              <SubmitButton className={buttonClass('primary')}>{t('Ci sono')} ✋</SubmitButton>
            </form>
          )}
          {current !== 'assente' && (
            <form action={rispondi.bind(null, match._id, 'assente')}>
              <SubmitButton className={buttonClass('secondary')}>{t('Non ci sono')}</SubmitButton>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
