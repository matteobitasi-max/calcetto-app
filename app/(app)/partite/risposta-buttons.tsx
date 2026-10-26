import { rispondi } from '@/app/actions'
import { SubmitButton } from '@/components/submit-button'
import { RispostaBadge, buttonClass } from '@/components/ui'
import { finestra, ordinati, type Match } from '@/lib/matches'
import { getT } from '@/lib/lingua'

// La mia risposta e, se la finestra è aperta, i pulsanti per cambiarla.
export async function RispostaButtons({ match, playerId }: { match: Match; playerId: string }) {
  const t = await getT()
  const current = match.convocazioni.find((c) => c.giocatore?._id === playerId)?.risposta
  const aperta = finestra(match) === 'aperta'
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
          {!going && (
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
