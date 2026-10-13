import Link from 'next/link'
import { Suspense } from 'react'
import { requirePlayer } from '@/lib/player'
import { getMatchesBetween, presenti, type Match, type Stato } from '@/lib/matches'
import { formatData, isoToRomeLocal } from '@/lib/dates'
import { assicuraRicorrenze } from '@/lib/series'
import { Card, Loading, StatoBadge } from '@/components/ui'

const GIORNI = ['L', 'M', 'M', 'G', 'V', 'S', 'D']
const DAY = 86_400_000

const COLORE: Record<Stato, string> = {
  aperta: 'bg-green-600 text-white',
  chiusa: 'bg-blue-600 text-white',
  giocata: 'bg-zinc-400 text-white dark:bg-zinc-600',
  annullata: 'bg-red-100 text-red-700 line-through dark:bg-red-950 dark:text-red-300',
}

export default function CalendarioPage({ searchParams }: PageProps<'/calendario'>) {
  return (
    <Suspense fallback={<Loading />}>
      <Calendario searchParams={searchParams} />
    </Suspense>
  )
}

const pad = (n: number) => String(n).padStart(2, '0')

async function Calendario({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ mese }, me] = await Promise.all([searchParams, requirePlayer()])
  await assicuraRicorrenze({ legaId: me.lega._id })

  const oggi = isoToRomeLocal(new Date()).slice(0, 10)
  const [y, m] = (typeof mese === 'string' && /^\d{4}-\d{2}$/.test(mese) ? mese : oggi.slice(0, 7)).split('-').map(Number)
  const inizio = Date.UTC(y, m - 1, 1)
  const giorniNelMese = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const vuoti = (new Date(inizio).getUTCDay() + 6) % 7 // lunedì = prima colonna

  // Un giorno di margine per lato: il giorno "italiano" può cadere a cavallo del giorno UTC.
  const matches = await getMatchesBetween(me.lega._id, new Date(inizio - DAY).toISOString(), new Date(Date.UTC(y, m, 1) + DAY).toISOString())
  const perGiorno = new Map<string, Match[]>()
  for (const match of matches) {
    const key = isoToRomeLocal(match.data).slice(0, 10)
    perGiorno.set(key, [...(perGiorno.get(key) ?? []), match])
  }
  const delMese = matches.filter((match) => isoToRomeLocal(match.data).startsWith(`${y}-${pad(m)}`))

  const prec = m === 1 ? `${y - 1}-12` : `${y}-${pad(m - 1)}`
  const succ = m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`
  const titolo = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(inizio)

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <Link href={`/calendario?mese=${prec}`} className="rounded-lg px-3 py-1 text-lg hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Mese precedente">
            ‹
          </Link>
          <h1 className="text-lg font-bold capitalize">{titolo}</h1>
          <Link href={`/calendario?mese=${succ}`} className="rounded-lg px-3 py-1 text-lg hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Mese successivo">
            ›
          </Link>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-zinc-500">
          {GIORNI.map((g, i) => (
            <div key={i}>{g}</div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {Array.from({ length: vuoti }, (_, i) => (
            <div key={`v${i}`} />
          ))}
          {Array.from({ length: giorniNelMese }, (_, i) => {
            const giorno = i + 1
            const key = `${y}-${pad(m)}-${pad(giorno)}`
            const partite = perGiorno.get(key)
            const base = `flex aspect-square flex-col items-center justify-center rounded-lg text-sm tabular-nums ${
              key === oggi ? 'ring-2 ring-green-600' : ''
            }`

            if (partite) {
              const p = partite[0]
              return (
                <Link key={key} href={`/partite/${p._id}`} className={`${base} font-bold ${COLORE[p.stato]}`} title={`${p.luogo}`}>
                  {giorno}
                  <span className="text-[10px] font-normal leading-none">⚽{partite.length > 1 && `×${partite.length}`}</span>
                </Link>
              )
            }
            if (me.isAdmin && key >= oggi) {
              return (
                <Link
                  key={key}
                  href={`/partite/nuova?giorno=${key}`}
                  className={`${base} text-zinc-700 hover:bg-green-50 hover:text-green-700 dark:text-zinc-300 dark:hover:bg-green-950`}
                  title="Crea una partita in questo giorno"
                >
                  {giorno}
                </Link>
              )
            }
            return (
              <div key={key} className={`${base} ${key < oggi ? 'text-zinc-400 dark:text-zinc-600' : ''}`}>
                {giorno}
              </div>
            )
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-green-600" />convocazioni aperte</span>
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-blue-600" />convocazioni chiuse</span>
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-zinc-400" />giocata</span>
          {me.isAdmin && <span>· tocca un giorno libero per creare una partita</span>}
        </div>
      </Card>

      <Card className="divide-y divide-zinc-200 p-0 dark:divide-zinc-800">
        {delMese.length === 0 ? (
          <p className="p-4 text-sm text-zinc-500">Nessuna partita in questo mese.</p>
        ) : (
          delMese.map((match) => (
            <Link key={match._id} href={`/partite/${match._id}`} className="flex items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800">
              <span className="min-w-0">
                <span className="block font-medium capitalize">{formatData(match.data, { weekday: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                <span className="block truncate text-zinc-500">
                  {match.luogo} · {presenti(match).length}/{match.postiDisponibili}
                </span>
              </span>
              <StatoBadge stato={match.stato} />
            </Link>
          ))
        )}
      </Card>
    </div>
  )
}
