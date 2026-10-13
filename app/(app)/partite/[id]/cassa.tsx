import { annullaPagamento, dichiaraPagamento, sollecitaPagamenti } from '@/app/actions'
import { PagaSatispay } from '@/components/paga-satispay'
import { SollecitaButton } from '@/components/sollecita-button'
import { SubmitButton } from '@/components/submit-button'
import { Card, PlayerRow } from '@/components/ui'
import { immagineUrl } from '@/lib/image'
import { presenti, type Match } from '@/lib/matches'
import type { Membro } from '@/lib/player'

const euro = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n)
const piccolo = 'rounded px-2 py-1 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800'

export const haPagato = (match: Match, playerId: string) => match.pagamenti.some((p) => p.giocatoreId === playerId)

// Accanto al mio nome nella lista: icona Satispay se devo ancora pagare, ✅ se ho pagato.
export function PagamentoInLista({ match, me, playerId }: { match: Match; me: Membro; playerId: string }) {
  if (match.quota == null || match.stato === 'annullata') return null
  if (haPagato(match, playerId)) return <span title="Quota pagata">✅</span>
  if (playerId !== me._id) return null
  return <PagaSatispay link={me.lega.satispayLink} quota={match.quota} segnaPagato={dichiaraPagamento.bind(null, match._id)} variante="icona" />
}

// La mia quota: pagamento con il link Satispay della lega.
export function MiaQuota({ match, me }: { match: Match; me: Membro }) {
  if (match.quota == null || match.stato === 'annullata') return null
  if (!presenti(match).some((c) => c.giocatore._id === me._id)) return null
  const pagato = haPagato(match, me._id)
  const qr = immagineUrl(me.lega.satispayQr, 600)

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">💶 La tua quota: {euro(match.quota)}</h2>
        {pagato ? (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-950 dark:text-green-300">✅ pagata</span>
        ) : (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800 dark:bg-red-950 dark:text-red-300">da pagare</span>
        )}
      </div>
      {pagato ? (
        <form action={annullaPagamento.bind(null, match._id, undefined)} className="text-right">
          <SubmitButton className={`${piccolo} text-zinc-400`} confirm="Segnare di nuovo come da pagare?">
            L&apos;ho segnata per errore
          </SubmitButton>
        </form>
      ) : (
        <>
          <PagaSatispay link={me.lega.satispayLink} quota={match.quota} segnaPagato={dichiaraPagamento.bind(null, match._id)} variante="pulsante" />
          <p className="text-xs text-zinc-500">
            {me.lega.satispayLink
              ? `Si apre Satispay: inserisci ${euro(match.quota)} e conferma, poi torna qui e tocca "Sì, ho pagato".`
              : "L'organizzatore non ha ancora impostato Satispay: paga come d'accordo, poi tocca \"Ho pagato\"."}
          </p>
          {qr && (
            <details className="text-sm">
              <summary className="cursor-pointer text-zinc-500">Mostra il QR (per pagare al campo da un altro telefono)</summary>
              {/* eslint-disable-next-line @next/next/no-img-element -- immagine dal CDN di Sanity */}
              <img src={qr} alt="QR Satispay" className="mx-auto mt-3 max-h-80 rounded-xl" />
            </details>
          )}
        </>
      )}
    </Card>
  )
}

// La cassa dell'organizzatore: chi ha pagato e chi manca.
export function Cassa({ match }: { match: Match }) {
  if (match.quota == null || match.stato === 'annullata') return null
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
            💰 Cassa
            <span className="text-zinc-400 transition group-open:rotate-180" aria-hidden>
              ▾
            </span>
          </h2>
          <dl className="grid grid-cols-2 gap-2 text-center">
            {(
              [
                ['Incassato', `${euro(pagati * match.quota)} · ${pagati}`, 'text-green-600'],
                ['Mancano', `${euro(mancanti * match.quota)} · ${mancanti}`, 'text-red-600'],
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
            {lista.map(({ giocatore }) => {
              const pagato = haPagato(match, giocatore._id)
              return (
                <li key={giocatore._id}>
                  <PlayerRow
                    player={giocatore}
                    right={
                      <span className="flex shrink-0 items-center gap-1 text-xs">
                        {pagato ? (
                          <>
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-800 dark:bg-green-950 dark:text-green-300">✅ pagato</span>
                            <form action={annullaPagamento.bind(null, match._id, giocatore._id)}>
                              <SubmitButton className={`${piccolo} text-zinc-400`} title="Annulla: torna da pagare" confirm="Segnare di nuovo come da pagare?">
                                ↩
                              </SubmitButton>
                            </form>
                          </>
                        ) : (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-800 dark:bg-red-950 dark:text-red-300">da pagare</span>
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
