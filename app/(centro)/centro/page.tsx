import Link from 'next/link'
import { Suspense } from 'react'
import { addDays, isoToRomeLocal } from '@/lib/dates'
import { campiAttivi, giornoISO, hhmm, minuti, oggiRoma, prenotazioniTra, requireCentro, type CampoCentro, type Prenotazione } from '@/lib/centro'
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
type Vista = 'giorno' | 'settimana' | 'mese'
const euro = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: n % 1 ? 2 : 0 }).format(n)

async function Planning({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ giorno: g, saltate, vista: v }, centro] = await Promise.all([searchParams, requireCentro()])
  const oggi = oggiRoma()
  const giorno = typeof g === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(g) ? g : oggi
  const vista: Vista = v === 'settimana' || v === 'mese' ? v : 'giorno'
  // il periodo mostrato: il giorno, la settimana (da lunedì) o il mese del giorno scelto
  const lunedi = addDays(giorno, -((new Date(`${giorno}T12:00:00Z`).getUTCDay() + 6) % 7))
  const primo = `${giorno.slice(0, 7)}-01`
  const giorniMese = new Date(Date.UTC(Number(giorno.slice(0, 4)), Number(giorno.slice(5, 7)), 0)).getUTCDate()
  const [inizio, giorniVista] = vista === 'settimana' ? [lunedi, 7] : vista === 'mese' ? [primo, giorniMese] : [giorno, 1]
  const da = giornoISO(inizio).da
  const a = giornoISO(addDays(inizio, giorniVista - 1)).a
  const prenotazioni = await prenotazioniTra(centro._id, da, a)
  const campi = campiAttivi(centro)
  const apre = minuti(centro.apre)
  const chiude = minuti(centro.chiude)
  const slot = Math.max(1, Math.ceil((chiude - apre) / 30))
  const data = (d: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('it-IT', { ...o, timeZone: 'UTC' }).format(new Date(`${d}T12:00:00Z`))
  const titolo =
    vista === 'mese'
      ? data(giorno, { month: 'long', year: 'numeric' })
      : vista === 'settimana'
        ? `${data(lunedi, { day: 'numeric', month: 'short' })} – ${data(addDays(lunedi, 6), { day: 'numeric', month: 'short' })}`
        : data(giorno, { weekday: 'long', day: 'numeric', month: 'long' })
  // indietro e avanti di un giorno, una settimana o un mese
  const sposta = (n: number) => {
    if (vista === 'giorno') return addDays(giorno, n)
    if (vista === 'settimana') return addDays(giorno, 7 * n)
    const d = new Date(Date.UTC(Number(giorno.slice(0, 4)), Number(giorno.slice(5, 7)) - 1 + n, 1))
    return d.toISOString().slice(0, 10)
  }
  const link = (x: { giorno?: string; vista?: Vista }) => {
    const vv = x.vista ?? vista
    return `/centro?giorno=${x.giorno ?? giorno}${vv === 'giorno' ? '' : `&vista=${vv}`}`
  }

  const ore = prenotazioni.reduce((s, p) => s + (Date.parse(p.fine) - Date.parse(p.inizio)) / 3_600_000, 0)
  const disponibili = ((chiude - apre) / 60) * campi.length * giorniVista
  const valore = prenotazioni.reduce((s, p) => s + (p.prezzo ?? 0), 0)
  const incassato = prenotazioni.filter((p) => p.pagato).reduce((s, p) => s + (p.prezzo ?? 0), 0)

  // la linea di "adesso", solo oggi e negli orari di apertura
  const adesso = giorno === oggi ? minuti(isoToRomeLocal(new Date()).slice(11)) : null
  const posizione = (iso: string) => minuti(isoToRomeLocal(iso).slice(11)) - apre

  return (
    <div className="space-y-4">
      {/* la vista (giorno, settimana, mese) e il periodo: indietro, avanti, oggi, una data a scelta */}
      <div className="flex flex-wrap items-center gap-2">
        <nav className="flex rounded-xl border border-stone-300 bg-white p-0.5 text-sm font-semibold dark:border-zinc-700 dark:bg-zinc-900">
          {(['giorno', 'settimana', 'mese'] as const).map((x) => (
            <Link
              key={x}
              href={link({ vista: x })}
              aria-current={x === vista ? 'page' : undefined}
              className={`rounded-lg px-3 py-1 capitalize ${x === vista ? 'bg-stone-900 text-white dark:bg-white dark:text-zinc-900' : 'text-stone-600 hover:bg-stone-100 dark:text-zinc-300 dark:hover:bg-zinc-800'}`}
            >
              {x}
            </Link>
          ))}
        </nav>
        <Link href={link({ giorno: sposta(-1) })} className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 font-semibold hover:bg-stone-100 dark:border-zinc-700 dark:bg-zinc-900" aria-label="Indietro">
          ‹
        </Link>
        <h1 className="min-w-0 text-xl font-extrabold capitalize">{titolo}</h1>
        <Link href={link({ giorno: sposta(1) })} className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 font-semibold hover:bg-stone-100 dark:border-zinc-700 dark:bg-zinc-900" aria-label="Avanti">
          ›
        </Link>
        {giorno !== oggi && (
          <Link href={link({ giorno: oggi })} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950">
            Oggi
          </Link>
        )}
        <form action="/centro" className="flex items-center gap-1">
          {vista !== 'giorno' && <input type="hidden" name="vista" value={vista} />}
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
          [vista === 'giorno' ? 'Valore del giorno' : vista === 'settimana' ? 'Valore della settimana' : 'Valore del mese', euro(valore)],
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
      ) : vista === 'settimana' ? (
        <Settimana lunedi={lunedi} oggi={oggi} campi={campi} prenotazioni={prenotazioni} link={(d) => link({ giorno: d, vista: 'giorno' })} />
      ) : vista === 'mese' ? (
        <Mese primo={primo} giorni={giorniMese} oggi={oggi} prenotazioni={prenotazioni} capienza={((chiude - apre) / 60) * campi.length} link={(d) => link({ giorno: d, vista: 'giorno' })} />
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

      {vista === 'mese' ? (
        <p className="text-xs text-stone-500">Più arancione = campi più pieni · per ogni giorno: prenotazioni, % di occupazione e valore · tocca un giorno per aprirlo</p>
      ) : (
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
          <span>
            <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-amber-400" />
            da incassare
          </span>
          <span>
            <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-green-500" />
            pagata
          </span>
          <span>· {vista === 'giorno' ? 'tocca uno spazio libero per prenotare' : 'tocca un giorno per aprirlo'}</span>
        </p>
      )}
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

const oraDi = (iso: string) => isoToRomeLocal(iso).slice(11)
const giornoDi = (iso: string) => isoToRomeLocal(iso).slice(0, 10)

// Settimana: una riga per campo, una colonna per giorno; in ogni casella le prenotazioni (ora e cliente).
function Settimana({
  lunedi,
  oggi,
  campi,
  prenotazioni,
  link,
}: {
  lunedi: string
  oggi: string
  campi: CampoCentro[]
  prenotazioni: Prenotazione[]
  link: (giorno: string) => string
}) {
  const giorni = Array.from({ length: 7 }, (_, i) => addDays(lunedi, i))
  const etichetta = (d: string) => new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${d}T12:00:00Z`))
  return (
    <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <table className="w-full min-w-[56rem] table-fixed border-collapse text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 w-32 border-b border-r border-stone-200 bg-white px-2 py-2 text-left text-sm dark:border-zinc-800 dark:bg-zinc-900">Campo</th>
            {giorni.map((d) => (
              <th key={d} className={`border-b border-r border-stone-200 px-1 py-2 last:border-r-0 dark:border-zinc-800 ${d === oggi ? 'bg-orange-50 dark:bg-orange-950/40' : ''}`}>
                <Link href={link(d)} className="text-sm font-bold capitalize hover:underline">
                  {etichetta(d)}
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {campi.map((c) => (
            <tr key={c._key}>
              <th className="sticky left-0 z-10 border-b border-r border-stone-200 bg-white px-2 py-2 text-left align-top dark:border-zinc-800 dark:bg-zinc-900">
                <p className="truncate text-sm font-bold">{c.nome}</p>
                <p className="font-normal text-stone-500">
                  a {c.tipo} · {c.coperto ? '🏠' : '🌤️'}
                </p>
              </th>
              {giorni.map((d) => {
                const sue = prenotazioni.filter((p) => p.campo === c._key && giornoDi(p.inizio) === d)
                return (
                  <td key={d} className={`h-16 border-b border-r border-stone-200 p-1 align-top last:border-r-0 dark:border-zinc-800 ${d === oggi ? 'bg-orange-50/50 dark:bg-orange-950/20' : ''}`}>
                    <div className="space-y-0.5">
                      {sue.map((p) => (
                        <Link
                          key={p._id}
                          href={`/centro/prenotazione/${p._id}`}
                          className={`block truncate rounded px-1 py-0.5 font-medium ${p.pagato ? 'bg-green-100 text-green-950 dark:bg-green-950 dark:text-green-100' : 'bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-100'}`}
                        >
                          <span className="tabular-nums">{oraDi(p.inizio)}</span> {p.cliente}
                        </Link>
                      ))}
                      <Link href={`/centro/prenota?giorno=${d}&campo=${c._key}`} className="block rounded px-1 text-stone-300 hover:bg-orange-50 hover:text-orange-600 dark:text-zinc-600 dark:hover:bg-orange-950/40">
                        +
                      </Link>
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Mese: il calendario del mese; ogni giorno con le prenotazioni, quanto sono pieni i campi (più arancio = più
// pieno) e il valore. Toccando un giorno si apre il suo planning.
function Mese({
  primo,
  giorni,
  oggi,
  prenotazioni,
  capienza,
  link,
}: {
  primo: string
  giorni: number
  oggi: string
  prenotazioni: Prenotazione[]
  capienza: number
  link: (giorno: string) => string
}) {
  const vuoti = (new Date(`${primo}T12:00:00Z`).getUTCDay() + 6) % 7
  const perGiorno = new Map<string, Prenotazione[]>()
  for (const p of prenotazioni) {
    const d = giornoDi(p.inizio)
    perGiorno.set(d, [...(perGiorno.get(d) ?? []), p])
  }
  const sfondo = (x: number) =>
    x >= 0.75 ? 'bg-orange-400 text-white' : x >= 0.5 ? 'bg-orange-300' : x >= 0.25 ? 'bg-orange-200' : x > 0 ? 'bg-orange-100 dark:bg-orange-950' : 'bg-white dark:bg-zinc-900'
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid grid-cols-7 gap-1 pb-1 text-center text-xs font-semibold text-stone-500">
        {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((g) => (
          <div key={g}>{g}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: vuoti }, (_, i) => (
          <div key={`v${i}`} />
        ))}
        {Array.from({ length: giorni }, (_, i) => {
          const d = addDays(primo, i)
          const sue = perGiorno.get(d) ?? []
          const ore = sue.reduce((s, p) => s + (Date.parse(p.fine) - Date.parse(p.inizio)) / 3_600_000, 0)
          const pieno = capienza ? ore / capienza : 0
          const valore = sue.reduce((s, p) => s + (p.prezzo ?? 0), 0)
          return (
            <Link
              key={d}
              href={link(d)}
              className={`flex min-h-20 flex-col rounded-lg border p-1.5 text-left hover:ring-2 hover:ring-orange-500 sm:min-h-24 ${sfondo(pieno)} ${d === oggi ? 'border-orange-600 ring-1 ring-orange-600' : 'border-stone-200 dark:border-zinc-800'}`}
            >
              <span className="text-sm font-bold">{i + 1}</span>
              {sue.length > 0 && (
                <span className="mt-auto space-y-0.5 text-[11px] leading-tight">
                  <span className="block font-semibold">{sue.length === 1 ? '1 pren.' : `${sue.length} pren.`}</span>
                  <span className="block tabular-nums opacity-80">
                    {Math.round(pieno * 100)}% · {euro(valore)}
                  </span>
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
