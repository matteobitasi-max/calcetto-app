import Link from 'next/link'
import { Suspense } from 'react'
import { addDays, isoToRomeLocal } from '@/lib/dates'
import { campiAttivi, giornoISO, hhmm, minuti, oggiRoma, prenotazioniTra, requireCentro, type Prenotazione } from '@/lib/centro'
import { Loading } from '@/components/ui'

// La pagina principale del gestionale: il planning di un giorno, con i campi in colonna e le ore in riga.
// Uno spazio libero si tocca per prenotare; una prenotazione si tocca per vederla, incassarla o spostarla.
export default function CalendarioCentroPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={<Loading />}>
      <Planning searchParams={searchParams} />
    </Suspense>
  )
}

const ALTEZZA = 30 // px ogni mezz'ora
const euro = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: n % 1 ? 2 : 0 }).format(n)

async function Planning({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ giorno: g, saltate }, centro] = await Promise.all([searchParams, requireCentro()])
  const oggi = oggiRoma()
  const giorno = typeof g === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(g) ? g : oggi
  const { da, a } = giornoISO(giorno)
  const prenotazioni = await prenotazioniTra(centro._id, da, a)
  const campi = campiAttivi(centro)
  const apre = minuti(centro.apre)
  const chiude = minuti(centro.chiude)
  const slot = Math.max(1, Math.ceil((chiude - apre) / 30))
  const titolo = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${giorno}T12:00:00Z`))

  const ore = prenotazioni.reduce((s, p) => s + (Date.parse(p.fine) - Date.parse(p.inizio)) / 3_600_000, 0)
  const disponibili = ((chiude - apre) / 60) * campi.length
  const valore = prenotazioni.reduce((s, p) => s + (p.prezzo ?? 0), 0)
  const incassato = prenotazioni.filter((p) => p.pagato).reduce((s, p) => s + (p.prezzo ?? 0), 0)

  // la linea di "adesso", solo oggi e negli orari di apertura
  const adesso = giorno === oggi ? minuti(isoToRomeLocal(new Date()).slice(11)) : null
  const posizione = (iso: string) => minuti(isoToRomeLocal(iso).slice(11)) - apre

  return (
    <div className="space-y-4">
      {/* il giorno: indietro, avanti, oggi, una data a scelta */}
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/centro?giorno=${addDays(giorno, -1)}`} className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 font-semibold hover:bg-stone-100 dark:border-zinc-700 dark:bg-zinc-900" aria-label="Giorno prima">
          ‹
        </Link>
        <h1 className="min-w-0 flex-1 text-xl font-extrabold capitalize sm:flex-none">{titolo}</h1>
        <Link href={`/centro?giorno=${addDays(giorno, 1)}`} className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 font-semibold hover:bg-stone-100 dark:border-zinc-700 dark:bg-zinc-900" aria-label="Giorno dopo">
          ›
        </Link>
        {giorno !== oggi && (
          <Link href="/centro" className="rounded-lg px-3 py-1.5 text-sm font-semibold text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950">
            Oggi
          </Link>
        )}
        <form action="/centro" className="flex items-center gap-1">
          <input type="date" name="giorno" defaultValue={giorno} className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
          <button type="submit" className="rounded-lg px-2 py-1 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-zinc-300 dark:hover:bg-zinc-800">
            Vai
          </button>
        </form>
        <Link href={`/centro/prenota?giorno=${giorno}`} className="ml-auto rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white shadow hover:bg-orange-600">
          + Prenota
        </Link>
      </div>

      {typeof saltate === 'string' && Number(saltate) > 0 && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          ⚠️ {saltate} {Number(saltate) === 1 ? 'settimana è stata saltata' : 'settimane sono state saltate'}: il campo era già occupato a quell’ora.
        </p>
      )}

      {/* i numeri del giorno */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ['Prenotazioni', String(prenotazioni.length)],
          ['Campi occupati', `${disponibili ? Math.round((ore / disponibili) * 100) : 0}%`],
          ['Valore del giorno', euro(valore)],
          ['Già incassato', euro(incassato)],
        ].map(([l, v]) => (
          <div key={l} className="rounded-xl border border-stone-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-medium text-stone-500">{l}</p>
            <p className="text-lg font-extrabold tabular-nums">{v}</p>
          </div>
        ))}
      </div>

      {campi.length === 0 ? (
        <p className="rounded-xl bg-white p-4 text-sm dark:bg-zinc-900">
          Non ci sono campi.{' '}
          <Link href="/centro/impostazioni" className="font-semibold text-orange-700 hover:underline">
            Aggiungili nelle impostazioni ›
          </Link>
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex min-w-max">
            {/* colonna delle ore */}
            <div className="sticky left-0 z-10 w-14 shrink-0 border-r border-stone-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <div className="h-10 border-b border-stone-200 dark:border-zinc-800" />
              {Array.from({ length: slot }, (_, i) => (
                <div key={i} className="relative border-b border-stone-100 text-right dark:border-zinc-800" style={{ height: ALTEZZA }}>
                  {i % 2 === 0 && <span className="absolute -top-2 right-1.5 bg-white px-0.5 text-[11px] tabular-nums text-stone-500 dark:bg-zinc-900">{hhmm(apre + i * 30)}</span>}
                </div>
              ))}
            </div>

            {campi.map((c) => {
              const sue = prenotazioni.filter((p) => p.campo === c._key)
              return (
                <div key={c._key} className="w-40 shrink-0 border-r border-stone-200 last:border-r-0 dark:border-zinc-800 sm:w-48">
                  <div className="flex h-10 flex-col justify-center border-b border-stone-200 px-2 dark:border-zinc-800">
                    <p className="truncate text-sm font-bold">{c.nome}</p>
                    <p className="text-[11px] text-stone-500">
                      Calcio a {c.tipo}
                      {c.coperto ? ' · 🏠 dentro' : ' · 🌤️ fuori'} · {euro(c.prezzoOra)}/h
                    </p>
                  </div>
                  <div className="relative" style={{ height: slot * ALTEZZA }}>
                    {/* gli spazi da mezz'ora: toccandoli si prenota */}
                    {Array.from({ length: slot }, (_, i) => (
                      <Link
                        key={i}
                        href={`/centro/prenota?giorno=${giorno}&campo=${c._key}&ora=${hhmm(apre + i * 30)}`}
                        className={`block border-b hover:bg-orange-50 dark:hover:bg-orange-950/40 ${i % 2 ? 'border-stone-200 dark:border-zinc-800' : 'border-stone-100 dark:border-zinc-800/60'}`}
                        style={{ height: ALTEZZA }}
                        aria-label={`Prenota ${c.nome} alle ${hhmm(apre + i * 30)}`}
                      />
                    ))}
                    {sue.map((p) => (
                      <Blocco key={p._id} p={p} top={(posizione(p.inizio) / 30) * ALTEZZA} altezza={((Date.parse(p.fine) - Date.parse(p.inizio)) / 1_800_000) * ALTEZZA} />
                    ))}
                    {adesso != null && adesso >= apre && adesso <= chiude && (
                      <div className="pointer-events-none absolute inset-x-0 border-t-2 border-red-500" style={{ top: ((adesso - apre) / 30) * ALTEZZA }} />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
        <span>
          <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-amber-400" />
          da incassare
        </span>
        <span>
          <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-green-500" />
          pagata
        </span>
        <span>· tocca uno spazio libero per prenotare</span>
      </p>
    </div>
  )
}

function Blocco({ p, top, altezza }: { p: Prenotazione; top: number; altezza: number }) {
  const pagata = !!p.pagato
  return (
    <Link
      href={`/centro/prenotazione/${p._id}`}
      className={`absolute inset-x-1 overflow-hidden rounded-lg border-l-4 px-2 py-1 text-xs shadow-sm ${
        pagata ? 'border-green-600 bg-green-100 text-green-950 dark:bg-green-950 dark:text-green-100' : 'border-amber-500 bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-100'
      }`}
      style={{ top: top + 1, height: Math.max(altezza - 2, 20) }}
    >
      <p className="truncate font-bold">
        {p.serie && '🔁 '}
        {p.cliente}
      </p>
      <p className="truncate tabular-nums opacity-80">
        {isoToRomeLocal(p.inizio).slice(11)}–{isoToRomeLocal(p.fine).slice(11)} · {euro(p.prezzo ?? 0)}
        {pagata && ' ✓'}
      </p>
    </Link>
  )
}
