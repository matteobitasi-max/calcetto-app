import { annullaDichiarazione, annullaPagamento, confermaPagamento, dichiaraPagamento, sollecitaPagamenti } from '@/app/actions'
import { SollecitaButton } from '@/components/sollecita-button'
import { SubmitButton } from '@/components/submit-button'
import { Card, PlayerRow, buttonClass } from '@/components/ui'
import { immagineUrl } from '@/lib/image'
import { presenti, type Match, type Pagamento } from '@/lib/matches'
import type { Membro } from '@/lib/player'

const euro = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n)

function Stato({ p }: { p?: Pagamento }) {
  if (!p) return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800 dark:bg-red-950 dark:text-red-300">da pagare</span>
  if (p.stato === 'dichiarato')
    return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">da confermare</span>
  return (
    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-950 dark:text-green-300">
      pagato{p.metodo === 'contanti' ? ' (contanti)' : ''}
    </span>
  )
}

const piccolo = 'rounded px-2 py-1 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800'

// La mia quota: pagamento con il link Satispay della lega e "Ho pagato".
export function MiaQuota({ match, me }: { match: Match; me: Membro }) {
  if (match.quota == null || match.stato === 'annullata') return null
  if (!presenti(match).some((c) => c.giocatore._id === me._id)) return null
  const mio = match.pagamenti.find((p) => p.giocatoreId === me._id)
  const link = me.lega.satispayLink
  const qr = immagineUrl(me.lega.satispayQr, 600)

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">💶 La tua quota: {euro(match.quota)}</h2>
        <Stato p={mio} />
      </div>
      {!mio && (
        <>
          <div className="flex flex-wrap gap-2">
            {link && (
              <a href={link} target="_blank" rel="noopener noreferrer" className={`${buttonClass('primary')} bg-[#ef4136] hover:bg-[#d63a30]`}>
                💳 Paga con Satispay
              </a>
            )}
            <form action={dichiaraPagamento.bind(null, match._id)}>
              <SubmitButton className={buttonClass('secondary')}>✓ Ho pagato</SubmitButton>
            </form>
          </div>
          <p className="text-xs text-zinc-500">
            {link
              ? `Si apre Satispay: inserisci ${euro(match.quota)} e conferma, poi torna qui e tocca "Ho pagato".`
              : "L'organizzatore non ha ancora impostato Satispay: paga come d'accordo, poi tocca \"Ho pagato\"."}
          </p>
        </>
      )}
      {mio?.stato === 'dichiarato' && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-zinc-500">L&apos;organizzatore deve confermare di averlo ricevuto.</span>
          <form action={annullaDichiarazione.bind(null, match._id)}>
            <SubmitButton className={piccolo}>Annulla</SubmitButton>
          </form>
        </div>
      )}
      {qr && !mio && (
        <details className="text-sm">
          <summary className="cursor-pointer text-zinc-500">Mostra il QR (per pagare al campo da un altro telefono)</summary>
          {/* eslint-disable-next-line @next/next/no-img-element -- immagine dal CDN di Sanity */}
          <img src={qr} alt="QR Satispay" className="mx-auto mt-3 max-h-80 rounded-xl" />
        </details>
      )}
    </Card>
  )
}

// La cassa dell'organizzatore: chi ha pagato, chi deve confermare, chi manca.
export function Cassa({ match }: { match: Match }) {
  if (match.quota == null || match.stato === 'annullata') return null
  const lista = presenti(match)
  if (lista.length === 0) return null
  const quota = match.quota
  const di = (id: string) => match.pagamenti.find((p) => p.giocatoreId === id)
  const confermati = lista.filter((c) => di(c.giocatore._id)?.stato === 'confermato').length
  const daConfermare = lista.filter((c) => di(c.giocatore._id)?.stato === 'dichiarato').length
  const mancanti = lista.length - confermati - daConfermare

  return (
    <Card className="space-y-4">
      <h2 className="font-semibold">💰 Cassa</h2>
      <dl className="grid grid-cols-3 gap-2 text-center">
        {(
          [
            ['Incassato', euro(confermati * quota), 'text-green-600'],
            ['Da confermare', euro(daConfermare * quota), 'text-amber-600'],
            ['Mancano', euro(mancanti * quota), 'text-red-600'],
          ] as const
        ).map(([label, valore, cls]) => (
          <div key={label} className="flex flex-col-reverse rounded-lg bg-zinc-50 py-2 dark:bg-zinc-950">
            <dt className="text-xs text-zinc-500">{label}</dt>
            <dd className={`text-lg font-bold tabular-nums ${cls}`}>{valore}</dd>
          </div>
        ))}
      </dl>

      <ul className="space-y-2">
        {lista.map(({ giocatore }) => {
          const p = di(giocatore._id)
          return (
            <li key={giocatore._id}>
              <PlayerRow
                player={giocatore}
                right={
                  <span className="flex shrink-0 items-center gap-1">
                    <Stato p={p} />
                    {p?.stato !== 'confermato' && (
                      <form action={confermaPagamento.bind(null, match._id, giocatore._id, 'satispay')}>
                        <SubmitButton className={`${piccolo} text-green-700 dark:text-green-400`} title="Conferma che l'hai ricevuto su Satispay">
                          ✓
                        </SubmitButton>
                      </form>
                    )}
                    {!p && (
                      <form action={confermaPagamento.bind(null, match._id, giocatore._id, 'contanti')}>
                        <SubmitButton className={piccolo} title="Ha pagato in contanti">
                          💶
                        </SubmitButton>
                      </form>
                    )}
                    {p && (
                      <form action={annullaPagamento.bind(null, match._id, giocatore._id)}>
                        <SubmitButton className={`${piccolo} text-zinc-400`} title="Annulla: torna da pagare">
                          ↩
                        </SubmitButton>
                      </form>
                    )}
                  </span>
                }
              />
            </li>
          )
        })}
      </ul>
      <p className="text-xs text-zinc-500">✓ ricevuto su Satispay · 💶 pagato in contanti · ↩ torna &quot;da pagare&quot;</p>
      <SollecitaButton action={sollecitaPagamenti.bind(null, match._id)} quanti={mancanti} />
    </Card>
  )
}
