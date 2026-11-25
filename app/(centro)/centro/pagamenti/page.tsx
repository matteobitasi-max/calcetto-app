import Link from 'next/link'
import { Suspense } from 'react'
import { METODI, NOME_METODO, daIncassare, incassati, requireCentro, type Prenotazione } from '@/lib/centro'
import { segnaPagato } from '@/app/centro-actions'
import { SubmitButton } from '@/components/submit-button'
import { Loading } from '@/components/ui'
import { romeLocalToISO } from '@/lib/dates'

// Pagamenti: in alto quello che c'è da incassare (prenotazioni già giocate e non pagate), con l'incasso a un
// tocco; sotto gli incassi del mese, divisi per metodo.
export default function PagamentiPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={<Loading />}>
      <Pagamenti searchParams={searchParams} />
    </Suspense>
  )
}

const euro = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n)
const quando = (iso: string) =>
  new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' }).format(new Date(iso))
const meseDi = (d: Date) => new Intl.DateTimeFormat('sv-SE', { year: 'numeric', month: '2-digit', timeZone: 'Europe/Rome' }).format(d).slice(0, 7)
const spostaMese = (mese: string, n: number) => {
  const [y, m] = mese.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + n, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

async function Pagamenti({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ mese: m }, centro] = await Promise.all([searchParams, requireCentro()])
  const mese = typeof m === 'string' && /^\d{4}-\d{2}$/.test(m) ? m : meseDi(new Date())
  const [aperti, presi] = await Promise.all([
    daIncassare(centro._id),
    incassati(centro._id, romeLocalToISO(`${mese}-01T00:00`), romeLocalToISO(`${spostaMese(mese, 1)}-01T00:00`)),
  ])
  const campo = new Map(centro.campi.map((c) => [c._key, c.nome]))
  const totaleAperti = aperti.reduce((s, p) => s + (p.prezzo ?? 0), 0)
  const totalePresi = presi.reduce((s, p) => s + (p.prezzo ?? 0), 0)
  const perMetodo = METODI.map((x) => ({ m: x, tot: presi.filter((p) => p.pagato?.metodo === x).reduce((s, p) => s + (p.prezzo ?? 0), 0) })).filter((x) => x.tot > 0)
  const titoloMese = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${mese}-15T12:00:00Z`))

  const riga = (p: Prenotazione, azioni: boolean) => (
    <li key={p._id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
      <Link href={`/centro/prenotazione/${p._id}`} className="min-w-0 flex-1 hover:underline">
        <p className="truncate font-semibold">{p.cliente}</p>
        <p className="text-xs capitalize text-stone-500">
          {quando(p.inizio)} · {campo.get(p.campo) ?? 'Campo'}
          {p.pagato && ` · ${NOME_METODO[p.pagato.metodo]}`}
        </p>
      </Link>
      <span className="font-bold tabular-nums">{euro(p.prezzo ?? 0)}</span>
      {azioni && (
        <span className="flex w-full gap-1.5 sm:w-auto">
          {METODI.slice(0, 3).map((x) => (
            <form key={x} action={segnaPagato.bind(null, p._id, x)} className="flex-1 sm:flex-none">
              <SubmitButton className="w-full rounded-lg border border-green-600 px-2 py-1 text-xs font-semibold text-green-800 hover:bg-green-50 dark:text-green-300 dark:hover:bg-green-950">
                {NOME_METODO[x]}
              </SubmitButton>
            </form>
          ))}
        </span>
      )}
    </li>
  )

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <div className="flex items-end justify-between gap-2">
          <h1 className="text-xl font-extrabold">Da incassare</h1>
          <p className="text-lg font-black tabular-nums text-amber-600">{euro(totaleAperti)}</p>
        </div>
        {aperti.length === 0 ? (
          <p className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-500 dark:border-zinc-800 dark:bg-zinc-900">✅ Tutto incassato: niente in sospeso.</p>
        ) : (
          <ul className="divide-y divide-stone-100 rounded-2xl border border-amber-300 bg-white dark:divide-zinc-800 dark:border-amber-800 dark:bg-zinc-900">{aperti.map((p) => riga(p, true))}</ul>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-extrabold">Incassi</h2>
          <Link href={`/centro/pagamenti?mese=${spostaMese(mese, -1)}`} className="rounded-lg border border-stone-300 bg-white px-2.5 py-1 dark:border-zinc-700 dark:bg-zinc-900" aria-label="Mese prima">
            ‹
          </Link>
          <span className="font-semibold capitalize">{titoloMese}</span>
          <Link href={`/centro/pagamenti?mese=${spostaMese(mese, 1)}`} className="rounded-lg border border-stone-300 bg-white px-2.5 py-1 dark:border-zinc-700 dark:bg-zinc-900" aria-label="Mese dopo">
            ›
          </Link>
          <p className="ml-auto text-lg font-black tabular-nums text-green-700 dark:text-green-400">{euro(totalePresi)}</p>
        </div>
        {perMetodo.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {perMetodo.map((x) => (
              <span key={x.m} className="rounded-full bg-white px-3 py-1 text-sm font-semibold shadow-sm dark:bg-zinc-900">
                {NOME_METODO[x.m]} · {euro(x.tot)}
              </span>
            ))}
          </div>
        )}
        {presi.length === 0 ? (
          <p className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-500 dark:border-zinc-800 dark:bg-zinc-900">Nessun incasso in questo mese.</p>
        ) : (
          <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">{presi.map((p) => riga(p, false))}</ul>
        )}
      </section>
    </div>
  )
}
