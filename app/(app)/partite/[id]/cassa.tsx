import { annullaPagamento, dichiaraPagamento, sollecitaPagamenti } from '@/app/actions'
import { PagaSatispay } from '@/components/paga-satispay'
import { SollecitaButton } from '@/components/sollecita-button'
import { SubmitButton } from '@/components/submit-button'
import { Card, PlayerRow } from '@/components/ui'
import { presenti, type Match } from '@/lib/matches'
import { mioInCima, type Membro } from '@/lib/player'
import { getT } from '@/lib/lingua'

const piccolo = 'rounded px-2 py-1 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800'

export const haPagato = (match: Match, playerId: string) => match.pagamenti.some((p) => p.giocatoreId === playerId)

// Accanto al mio nome nella lista: icona Satispay se devo ancora pagare, ✅ se ho pagato
// (con ↩ per annullare se l'ho segnato per errore).
export async function PagamentoInLista({ match, me, playerId }: { match: Match; me: Membro; playerId: string }) {
  if (match.quota == null || match.stato === 'annullata') return null
  const t = await getT()
  if (haPagato(match, playerId)) {
    if (playerId !== me._id) return <span title={t('Quota pagata')}>✅</span>
    return (
      <span className="flex shrink-0 items-center">
        <span title={t('Quota pagata')}>✅</span>
        <form action={annullaPagamento.bind(null, match._id, undefined)}>
          <SubmitButton className={`${piccolo} text-zinc-400`} title={t('L’ho segnata per errore')} confirm={t('Segnare di nuovo come da pagare?')}>
            ↩
          </SubmitButton>
        </form>
      </span>
    )
  }
  if (playerId !== me._id) return null
  return <PagaSatispay link={me.lega.satispayLink} quota={match.quota} segnaPagato={dichiaraPagamento.bind(null, match._id)} variante="icona" />
}

// La cassa dell'organizzatore: chi ha pagato e chi manca.
export async function Cassa({ match, mioId }: { match: Match; mioId?: string }) {
  if (match.quota == null || match.stato === 'annullata') return null
  const t = await getT()
  const euro = (n: number) => t.numero(n, { style: 'currency', currency: 'EUR' })
  const lista = presenti(match)
  if (lista.length === 0) return null
  const pagati = lista.filter((c) => haPagato(match, c.giocatore._id)).length
  const mancanti = lista.length - pagati

  return (
    <Card className="p-0!">
      <details className="group">
        {/* Chiusa: solo i totali. Toccando si apre l'elenco dei giocatori. */}
        <summary className="cursor-pointer list-none space-y-3 p-4 [&::-webkit-details-marker]:hidden">
          <h2 className="flex items-center justify-between font-semibold">
            💰 {t('Cassa')}
            <span className="text-zinc-400 transition group-open:rotate-180" aria-hidden>
              ▾
            </span>
          </h2>
          <dl className="grid grid-cols-2 gap-2 text-center">
            {(
              [
                [t('Incassato'), `${euro(pagati * match.quota)} · ${pagati}`, 'text-green-600'],
                [t('Mancano'), `${euro(mancanti * match.quota)} · ${mancanti}`, 'text-red-600'],
              ] as const
            ).map(([label, valore, cls]) => (
              <div key={label} className="flex flex-col-reverse rounded-lg bg-zinc-50 py-2 dark:bg-zinc-950">
                <dt className="text-xs text-zinc-500">{label}</dt>
                <dd className={`text-lg font-bold tabular-nums ${cls}`}>{valore}</dd>
              </div>
            ))}
          </dl>
        </summary>

        <div className="space-y-4 border-t border-zinc-200 p-4 dark:border-zinc-800">
          <ul className="space-y-2">
            {mioInCima(lista, mioId, (c) => c.giocatore._id).map(({ giocatore }) => {
              const pagato = haPagato(match, giocatore._id)
              return (
                <li key={giocatore._id}>
                  <PlayerRow
                    player={giocatore}
                    mio={giocatore._id === mioId}
                    right={
                      <span className="flex shrink-0 items-center gap-1 text-xs">
                        {pagato ? (
                          <>
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-800 dark:bg-green-950 dark:text-green-300">✅ {t('pagato')}</span>
                            <form action={annullaPagamento.bind(null, match._id, giocatore._id)}>
                              <SubmitButton className={`${piccolo} text-zinc-400`} title={t('Annulla: torna da pagare')} confirm={t('Segnare di nuovo come da pagare?')}>
                                ↩
                              </SubmitButton>
                            </form>
                          </>
                        ) : (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-800 dark:bg-red-950 dark:text-red-300">{t('da pagare')}</span>
                        )}
                      </span>
                    }
                  />
                </li>
              )
            })}
          </ul>
          <SollecitaButton action={sollecitaPagamenti.bind(null, match._id)} quanti={mancanti} />
        </div>
      </details>
    </Card>
  )
}
