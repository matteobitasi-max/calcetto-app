import Link from 'next/link'
import { Suspense } from 'react'
import { numeriMese, prenotazioniTra, requireCentro } from '@/lib/centro'
import { Loading } from '@/components/ui'
import { romeLocalToISO } from '@/lib/dates'

// Statistiche del mese: quanto sono occupati i campi, quanto si è incassato, quali campi, giorni e fasce
// orarie rendono di più (e quali restano vuoti), i clienti più fedeli. Confronto con il mese prima.
export default function StatisticheCentroPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={<Loading />}>
      <Statistiche searchParams={searchParams} />
    </Suspense>
  )
}

const euro = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
const perc = (x: number) => `${Math.round(x * 100)}%`
const meseDi = (d: Date) => new Intl.DateTimeFormat('sv-SE', { year: 'numeric', month: '2-digit', timeZone: 'Europe/Rome' }).format(d).slice(0, 7)
const spostaMese = (mese: string, n: number) => {
  const [y, m] = mese.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + n, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}
const GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

async function Statistiche({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ mese: m }, centro] = await Promise.all([searchParams, requireCentro()])
  const mese = typeof m === 'string' && /^\d{4}-\d{2}$/.test(m) ? m : meseDi(new Date())
  const prima = spostaMese(mese, -1)
  const periodo = (x: string) => [romeLocalToISO(`${x}-01T00:00`), romeLocalToISO(`${spostaMese(x, 1)}-01T00:00`)] as const
  const [tutte, tuttePrima] = await Promise.all([prenotazioniTra(centro._id, ...periodo(mese), true), prenotazioniTra(centro._id, ...periodo(prima), true)])
  // contano le prenotazioni confermate; le annullate a parte (rifiutate e richieste in attesa no)
  const valide = (l: typeof tutte) => l.filter((p) => p.stato === 'confermata')
  const annullate = (l: typeof tutte) => l.filter((p) => p.stato === 'annullata').length
  const n = numeriMese(centro, mese, valide(tutte), annullate(tutte))
  const np = numeriMese(centro, prima, valide(tuttePrima), annullate(tuttePrima))
  const titolo = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${mese}-15T12:00:00Z`))

  const variazione = (ora: number, prima: number) => {
    if (!prima) return null
    const v = (ora - prima) / prima
    return <span className={`text-xs font-bold ${v >= 0 ? 'text-green-600' : 'text-red-600'}`}>{`${v >= 0 ? '▲' : '▼'} ${Math.abs(Math.round(v * 100))}%`}</span>
  }
  const maxGiorno = Math.max(1, ...n.perGiorno)
  const maxFascia = Math.max(1, ...n.perFascia.map(([, o]) => o))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-extrabold">Statistiche</h1>
        <Link href={`/centro/statistiche?mese=${prima}`} className="rounded-lg border border-stone-300 bg-white px-2.5 py-1 dark:border-zinc-700 dark:bg-zinc-900" aria-label="Mese prima">
          ‹
        </Link>
        <span className="font-semibold capitalize">{titolo}</span>
        <Link href={`/centro/statistiche?mese=${spostaMese(mese, 1)}`} className="rounded-lg border border-stone-300 bg-white px-2.5 py-1 dark:border-zinc-700 dark:bg-zinc-900" aria-label="Mese dopo">
          ›
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Campi occupati', perc(n.occupazione), variazione(n.occupazione, np.occupazione), `${Math.round(n.ore)} ore prenotate`],
          ['Valore prenotazioni', euro(n.valore), variazione(n.valore, np.valore), `${n.prenotazioni} prenotazioni`],
          ['Incassato', euro(n.pagato), variazione(n.pagato, np.pagato), `da incassare ${euro(n.daPagare)}`],
          ['Annullate', String(n.annullate), null, n.prenotazioni + n.annullate ? `${perc(n.annullate / (n.prenotazioni + n.annullate))} del totale` : '—'],
        ].map(([l, v, d, s]) => (
          <div key={String(l)} className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{l}</p>
            <p className="mt-1 flex items-baseline gap-2 text-3xl font-black tabular-nums">
              {v} {d}
            </p>
            <p className="text-xs text-stone-500">{s}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Riquadro titolo="Per campo">
          {n.perCampo.map((c) => (
            <Barra key={c.nome} etichetta={c.nome} valore={c.occupazione} testo={`${perc(c.occupazione)} · ${euro(c.incasso)}`} />
          ))}
        </Riquadro>
        <Riquadro titolo="Per giorno della settimana (ore)">
          {n.perGiorno.map((o, i) => (
            <Barra key={GIORNI[i]} etichetta={GIORNI[i]} valore={o / maxGiorno} testo={`${Math.round(o)} h`} />
          ))}
        </Riquadro>
        <Riquadro titolo="Per fascia oraria (ore, per ora di inizio)">
          {n.perFascia.length === 0 ? (
            <p className="text-sm text-stone-500">Nessuna prenotazione.</p>
          ) : (
            n.perFascia.map(([ora, o]) => <Barra key={ora} etichetta={`${String(ora).padStart(2, '0')}:00`} valore={o / maxFascia} testo={`${Math.round(o * 10) / 10} h`} />)
          )}
        </Riquadro>
        <Riquadro titolo="Clienti più fedeli">
          {n.clienti.length === 0 ? (
            <p className="text-sm text-stone-500">Nessuna prenotazione.</p>
          ) : (
            <ol className="space-y-1.5 text-sm">
              {n.clienti.map((c, i) => (
                <li key={c.nome} className="flex items-center gap-2">
                  <span className="w-5 text-right font-bold text-stone-400">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{c.nome}</span>
                  <span className="tabular-nums text-stone-500">
                    {c.n} pren. · {euro(c.spesa)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Riquadro>
      </div>
    </div>
  )
}

function Riquadro({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5 rounded-2xl border border-stone-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="font-bold">{titolo}</h2>
      {children}
    </section>
  )
}

function Barra({ etichetta, valore, testo }: { etichetta: string; valore: number; testo: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-20 shrink-0 truncate font-medium">{etichetta}</span>
      <span className="h-3 flex-1 overflow-hidden rounded-full bg-stone-100 dark:bg-zinc-800">
        <span className="block h-full rounded-full bg-orange-500" style={{ width: `${Math.min(100, Math.round(valore * 100))}%` }} />
      </span>
      <span className="w-28 shrink-0 text-right text-xs tabular-nums text-stone-500">{testo}</span>
    </div>
  )
}
