import Link from 'next/link'
import { Suspense } from 'react'
import { getMemberships, requirePlayer } from '@/lib/player'
import { finestra, getMatchesBetween, presenti, type Match, type Stato } from '@/lib/matches'
import { formatData, isoToRomeLocal } from '@/lib/dates'
import { assicuraRicorrenze } from '@/lib/series'
import { Card, Loading, StatoBadge } from '@/components/ui'
import { avatarUrl } from '@/lib/image'
import { FiltroLega } from './filtro-lega'

const GIORNI = ['L', 'M', 'M', 'G', 'V', 'S', 'D']
const DAY = 86_400_000

const COLORE: Record<Stato | 'non_ancora' | 'scaduta', string> = {
  non_ancora: 'bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100',
  aperta: 'bg-green-600 text-white',
  scaduta: 'bg-amber-500 text-white',
  chiusa: 'bg-blue-600 text-white',
  giocata: 'bg-zinc-400 text-white dark:bg-zinc-600',
  annullata: 'bg-red-100 text-red-700 line-through dark:bg-red-950 dark:text-red-300',
}

// Colore del giorno: segue la finestra vera delle convocazioni, come l'etichetta.
const coloreDi = (m: Match) => {
  const f = m.stato === 'aperta' ? finestra(m) : null
  return COLORE[f === 'non_ancora' || f === 'scaduta' ? f : m.stato]
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
  const [{ mese, lega, giorno }, , mie] = await Promise.all([searchParams, requirePlayer(), getMemberships()])
  // Solo le leghe di cui faccio parte (non quella in cui il super admin è entrato da ospite):
  // di default tutte, o quella scelta dalla tendina.
  const membri = mie
  if (!membri.length) {
    return (
      <Card className="space-y-2 text-center text-sm text-zinc-500">
        <p>Non fai parte di nessuna lega, quindi non ci sono partite da mostrare.</p>
        <Link href="/benvenuto" className="font-medium text-green-700 hover:underline dark:text-green-400">
          Crea una lega o entra in una →
        </Link>
      </Card>
    )
  }
  const inVista = membri.filter((x) => (typeof lega === 'string' && membri.some((y) => y.lega._id === lega) ? x.lega._id === lega : true))
  const scelta = inVista.length === 1 && membri.length > 1 ? inVista[0].lega._id : 'tutte'
  const nomeLega = new Map(membri.map((x) => [x.lega._id, x.lega.nome]))
  const organizzo = inVista.filter((x) => x.isAdmin)
  const piuLeghe = inVista.length > 1
  await Promise.all(inVista.map((x) => assicuraRicorrenze({ legaId: x.lega._id })))

  const oggi = isoToRomeLocal(new Date()).slice(0, 10)
  const [y, m] = (typeof mese === 'string' && /^\d{4}-\d{2}$/.test(mese) ? mese : oggi.slice(0, 7)).split('-').map(Number)
  const inizio = Date.UTC(y, m - 1, 1)
  const giorniNelMese = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const vuoti = (new Date(inizio).getUTCDay() + 6) % 7 // lunedì = prima colonna

  // Un giorno di margine per lato: il giorno "italiano" può cadere a cavallo del giorno UTC.
  const matches = await getMatchesBetween(
    inVista.map((x) => x.lega._id),
    new Date(inizio - DAY).toISOString(), new Date(Date.UTC(y, m, 1) + DAY).toISOString(),
  )
  const perGiorno = new Map<string, Match[]>()
  for (const match of matches) {
    const key = isoToRomeLocal(match.data).slice(0, 10)
    perGiorno.set(key, [...(perGiorno.get(key) ?? []), match])
  }
  const delMese = matches.filter((match) => isoToRomeLocal(match.data).startsWith(`${y}-${pad(m)}`))

  const prec = m === 1 ? `${y - 1}-12` : `${y}-${pad(m - 1)}`
  const succ = m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`
  const meseCorrente = `${y}-${pad(m)}`
  // I link del calendario tengono la lega scelta nella tendina.
  const url = (q: { mese?: string; giorno?: string }) =>
    `/calendario?mese=${q.mese ?? meseCorrente}${scelta === 'tutte' ? '' : `&lega=${scelta}`}${q.giorno ? `&giorno=${q.giorno}` : ''}`
  const giornoScelto = typeof giorno === 'string' && giorno.startsWith(`${meseCorrente}-`) && /^\d{4}-\d{2}-\d{2}$/.test(giorno) ? giorno : null
  const titolo = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(inizio)

  return (
    <div className="space-y-4">
      {membri.length > 1 && (
        <FiltroLega
          leghe={membri.map((x) => ({ id: x.lega._id, nome: x.lega.nome, logo: avatarUrl(x.lega.logo, 64), organizzatore: !!x.isAdmin }))}
          scelta={scelta}
          mese={meseCorrente}
        />
      )}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <Link href={url({ mese: prec })} className="rounded-lg px-3 py-1 text-lg hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Mese precedente">
            ‹
          </Link>
          <h1 className="text-lg font-bold capitalize">{titolo}</h1>
          <Link href={url({ mese: succ })} className="rounded-lg px-3 py-1 text-lg hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Mese successivo">
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
            } ${key === giornoScelto ? 'outline-2 outline-offset-2 outline-zinc-900 dark:outline-white' : ''}`
            // Toccando un giorno si vedono sotto le sue partite (e, per chi organizza, il pulsante per crearne una).
            const colore = partite
              ? `font-bold ${coloreDi(partite[0])}`
              : key < oggi
                ? 'text-zinc-400 dark:text-zinc-600'
                : 'text-zinc-700 hover:bg-green-50 hover:text-green-700 dark:text-zinc-300 dark:hover:bg-green-950'
            return (
              <Link key={key} href={url({ giorno: key })} scroll={false} className={`${base} ${colore}`} aria-current={key === giornoScelto ? 'date' : undefined}>
                {giorno}
                {partite && <span className="text-[10px] font-normal leading-none">⚽{partite.length > 1 && `×${partite.length}`}</span>}
              </Link>
            )
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-zinc-300" />in programma</span>
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-green-600" />convocazioni aperte</span>
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-blue-600" />convocazioni chiuse</span>
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-zinc-400" />giocata</span>
          <span>· tocca un giorno per vederne le partite</span>
        </div>
      </Card>

      {giornoScelto && (
        <GiornoScelto
          giorno={giornoScelto}
          partite={perGiorno.get(giornoScelto) ?? []}
          nomeLega={nomeLega}
          organizzo={giornoScelto >= oggi ? organizzo.map((x) => ({ id: x.lega._id, nome: x.lega.nome })) : []}
          chiudi={url({})}
        />
      )}

      <Card className="divide-y divide-zinc-200 p-0 dark:divide-zinc-800">
        {delMese.length === 0 ? (
          <p className="p-4 text-sm text-zinc-500">Nessuna partita in questo mese.</p>
        ) : (
          delMese.map((match) => (
            <Link key={match._id} href={`/partite/${match._id}`} className="flex items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800">
              <span className="min-w-0">
                <span className="block font-medium capitalize">{formatData(match.data, { weekday: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                <span className="block truncate text-zinc-500">
                  {piuLeghe && <b className="font-semibold">{nomeLega.get(match.legaId)} · </b>}
                  {match.luogo} · {presenti(match).length}/{match.postiDisponibili}
                </span>
              </span>
              <StatoBadge match={match} />
            </Link>
          ))
        )}
      </Card>
    </div>
  )
}

// Le partite del giorno toccato, ognuna con la sua lega; chi organizza può crearne una in quel giorno.
function GiornoScelto({
  giorno,
  partite,
  nomeLega,
  organizzo,
  chiudi,
}: {
  giorno: string
  partite: Match[]
  nomeLega: Map<string, string>
  organizzo: { id: string; nome: string }[]
  chiudi: string
}) {
  return (
    <Card className="divide-y divide-zinc-200 border-2 border-green-600 p-0 dark:divide-zinc-800">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <h2 className="font-bold capitalize">{formatData(`${giorno}T12:00:00Z`, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
        <Link href={chiudi} scroll={false} aria-label="Chiudi" className="rounded-lg px-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
          ✕
        </Link>
      </div>
      {partite.length === 0 && <p className="px-4 py-3 text-sm text-zinc-500">Nessuna partita in questo giorno.</p>}
      {partite.map((match) => (
        <Link key={match._id} href={`/partite/${match._id}`} className="flex items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800">
          <span className="min-w-0">
            <span className="block font-semibold">🏟️ {nomeLega.get(match.legaId)}</span>
            <span className="block truncate text-zinc-500">
              {formatData(match.data, { hour: '2-digit', minute: '2-digit' })} · {match.luogo} · {presenti(match).length}/{match.postiDisponibili}
            </span>
          </span>
          <StatoBadge match={match} />
        </Link>
      ))}
      {organizzo.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 py-3">
          {organizzo.map((l) => (
            <Link
              key={l.id}
              href={`/partite/nuova?giorno=${giorno}&lega=${l.id}`}
              className="rounded-full bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
            >
              ＋ Nuova partita{organizzo.length > 1 && ` · ${l.nome}`}
            </Link>
          ))}
        </div>
      )}
    </Card>
  )
}
