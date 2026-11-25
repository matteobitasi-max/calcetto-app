import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { METODI, NOME_METODO, getPrenotazione, requireCentro } from '@/lib/centro'
import { annullaPrenotazione, rispondiRichiesta, salvaPrenotazione, segnaPagato, togliPagamento } from '@/app/centro-actions'
import { PrenotazioneForm } from '@/components/prenotazione-form'
import { SubmitButton } from '@/components/submit-button'
import { Loading } from '@/components/ui'
import { isoToRomeLocal } from '@/lib/dates'

export default function PrenotazionePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<Loading />}>
      <Dettaglio params={params} />
    </Suspense>
  )
}

const euro = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n)

async function Dettaglio({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, centro] = await Promise.all([params, requireCentro()])
  const p = await getPrenotazione(centro._id, id)
  if (!p) notFound()
  const campo = centro.campi.find((c) => c._key === p.campo)
  const giorno = isoToRomeLocal(p.inizio).slice(0, 10)
  const quando = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' }).format(new Date(p.inizio))
  const annullata = p.stato === 'annullata' || p.stato === 'rifiutata'
  const richiesta = p.stato === 'richiesta'
  const dallApp = !!p.matchId

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href={`/centro?giorno=${giorno}`} className="text-sm font-medium text-stone-500 hover:underline">
        ‹ Calendario
      </Link>
      <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-extrabold">
              {p.serie && '🔁 '}
              {p.cliente}
            </h1>
            <p className="capitalize text-stone-600 dark:text-zinc-300">{quando}</p>
            <p className="text-sm text-stone-500">
              {campo?.nome ?? 'Campo'} · fino alle {isoToRomeLocal(p.fine).slice(11)}
              {p.telefono && (
                <>
                  {' · '}
                  <a href={`tel:${p.telefono}`} className="font-medium text-orange-700 hover:underline">
                    {p.telefono}
                  </a>
                </>
              )}
            </p>
          </div>
          <p className="shrink-0 text-2xl font-black tabular-nums">{euro(p.prezzo ?? 0)}</p>
        </div>

        {p.email && (
          <p className="mt-1 text-sm text-stone-500">
            ✉️ {p.email}
            {dallApp ? ' · 🔗 collegata alla sua partita su The Cap' : ''}
          </p>
        )}
        {dallApp && (
          <p className="mt-2 inline-block rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-900 dark:bg-sky-950 dark:text-sky-100">
            📱 Prenotata dall’app{p.lega ? ` · lega ${p.lega}` : ''}
          </p>
        )}
        {annullata ? (
          <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800 dark:bg-red-950 dark:text-red-200">{p.stato === 'rifiutata' ? '❌ Rifiutata' : '❌ Annullata'}</p>
        ) : richiesta ? (
          <div className="mt-3 space-y-2 rounded-xl bg-sky-50 p-3 dark:bg-sky-950/40">
            <p className="text-sm font-semibold text-sky-900 dark:text-sky-100">📥 Richiesta dall’app: il campo è tenuto finché non rispondi.</p>
            <div className="flex gap-2">
              <form action={rispondiRichiesta.bind(null, p._id, true)}>
                <SubmitButton className="rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700">✅ Conferma</SubmitButton>
              </form>
              <form action={rispondiRichiesta.bind(null, p._id, false)}>
                <SubmitButton className="rounded-xl border border-red-300 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50 dark:text-red-300" confirm="Rifiutare la richiesta? L’organizzatore riceve un avviso e il campo torna libero.">
                  Rifiuta
                </SubmitButton>
              </form>
            </div>
          </div>
        ) : p.pagato ? (
          <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-green-50 p-3 text-sm dark:bg-green-950">
            <span className="font-semibold text-green-900 dark:text-green-200">
              ✅ Pagata · {NOME_METODO[p.pagato.metodo]} · {new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', timeZone: 'Europe/Rome' }).format(new Date(p.pagato.il))}
            </span>
            <form action={togliPagamento.bind(null, p._id)}>
              <SubmitButton className="text-xs text-stone-500 hover:underline" confirm="Togliere il pagamento?">
                Annulla incasso
              </SubmitButton>
            </form>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            <p className="text-sm font-semibold">Incassa</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {METODI.map((m) => (
                <form key={m} action={segnaPagato.bind(null, p._id, m)}>
                  <SubmitButton className="w-full rounded-xl border border-green-600 bg-green-50 px-3 py-2 text-sm font-semibold text-green-900 hover:bg-green-100 dark:bg-green-950 dark:text-green-100">
                    {NOME_METODO[m]}
                  </SubmitButton>
                </form>
              ))}
            </div>
          </div>
        )}
        {p.nota && <p className="mt-3 whitespace-pre-line text-sm text-stone-600 dark:text-zinc-300">{p.nota}</p>}
      </div>

      {!annullata && (
        <>
          {dallApp ? (
            <p className="rounded-xl bg-white p-3 text-sm text-stone-600 dark:bg-zinc-900 dark:text-zinc-300">
              È collegata a una partita dell’app: se l’organizzatore sposta la partita, la prenotazione si sposta da sola. Se annulli, l’organizzatore riceve un avviso.
            </p>
          ) : (
            <>
              <h2 className="pt-2 font-bold">Modifica o sposta</h2>
              <PrenotazioneForm centro={centro} action={salvaPrenotazione.bind(null, p._id)} p={p} />
            </>
          )}
          <div className="flex flex-wrap gap-4">
            <form action={annullaPrenotazione.bind(null, p._id, false)}>
              <SubmitButton className="text-sm font-semibold text-red-600 hover:underline" confirm="Annullare questa prenotazione? Il campo torna libero.">
                Annulla prenotazione
              </SubmitButton>
            </form>
            {p.serie && (
              <form action={annullaPrenotazione.bind(null, p._id, true)}>
                <SubmitButton className="text-sm font-semibold text-red-600 hover:underline" confirm="Annullare questa e tutte le prossime della serie (quelle non ancora pagate)?">
                  Annulla questa e le prossime 🔁
                </SubmitButton>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  )
}
