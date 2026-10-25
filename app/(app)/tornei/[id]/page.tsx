import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense, type ReactNode } from 'react'
import { eliminaTorneo } from '@/app/actions'
import { displayName, membroDi } from '@/lib/player'
import { getPartiteTorneo, type Match } from '@/lib/matches'
import { getTorneo } from '@/lib/tornei'
import { classifica } from '@/lib/girone'
import { nomeTurno, tabellone, type Incrocio } from '@/lib/tabellone'
import { formatData } from '@/lib/dates'
import { avatarUrl } from '@/lib/image'
import { SubmitButton } from '@/components/submit-button'
import { ButtonLink, Card, Loading, StatoBadge } from '@/components/ui'

export default function TorneoPage({ params }: PageProps<'/tornei/[id]'>) {
  return (
    <Suspense fallback={<Loading />}>
      <Torneo params={params} />
    </Suspense>
  )
}

const breve = { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' } as const

async function Torneo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const torneo = await getTorneo(id)
  const me = await membroDi(torneo?.legaId)
  if (!torneo || !me) notFound()
  const partite = await getPartiteTorneo(torneo._id)

  const tabella = classifica(
    torneo.squadre,
    partite.filter((m) => m.stato === 'giocata').map((m) => ({ chiaveA: m.chiaveA, chiaveB: m.chiaveB, golA: m.risultato?.golA, golB: m.risultato?.golB })),
    torneo.puntiVittoria,
    torneo.puntiPareggio,
  )
  const colore = new Map(torneo.squadre.map((s) => [s._key, s.colore]))
  const foto = new Map(torneo.squadre.map((s) => [s._key, avatarUrl(s.logo, 96)]))
  const stemma = (chiave: string | undefined, size = 20) => <StemmaSquadra colore={chiave ? colore.get(chiave) : undefined} foto={chiave ? foto.get(chiave) : null} size={size} />

  // Marcatori del torneo, con la squadra di ognuno.
  const giocatori = new Map(torneo.squadre.flatMap((s) => s.giocatori.map((g) => [g._id, { nome: displayName(g), squadra: s.nome, colore: s.colore }] as const)))
  const gol = new Map<string, number>()
  for (const m of partite) for (const g of m.marcatori) gol.set(g.giocatoreId, (gol.get(g.giocatoreId) ?? 0) + g.gol)
  const marcatori = [...gol].filter(([pid]) => giocatori.has(pid)).sort((a, b) => b[1] - a[1]).slice(0, 10)

  const perGiornata = new Map<number, Match[]>()
  for (const m of partite) perGiornata.set(m.turno ?? 0, [...(perGiornata.get(m.turno ?? 0) ?? []), m])
  const giocate = partite.filter((m) => m.stato === 'giocata').length
  const eliminazione = torneo.formato === 'eliminazione'
  const tab = eliminazione
    ? tabellone(
        torneo.squadre.map((s) => s._key),
        partite.map((m) => ({ ...m, golA: m.risultato?.golA, golB: m.risultato?.golB })),
        torneo.primoTurno,
      )
    : []
  const nomeSquadra = new Map(torneo.squadre.map((s) => [s._key, s.nome]))
  const campione = tab.at(-1)?.[0]?.vincitore

  return (
    <div className="space-y-4 pb-8">
      <div>
        <Link href="/tornei" className="text-sm text-green-700 hover:underline dark:text-green-400">
          ← Tornei
        </Link>
        <h1 className="mt-1 text-xl font-bold">🏆 {torneo.nome}</h1>
        <p className="text-sm text-zinc-500">
          🏟️ {me.lega.nome} · {eliminazione ? 'Eliminazione diretta' : <>Girone all&apos;italiana{torneo.andataRitorno && ' (andata e ritorno)'}</>} ·{' '}
          {giocate}/{partite.length} partite giocate
        </p>
        {me.isAdmin && (
          <div className="mt-2">
            <ButtonLink href={`/tornei/${torneo._id}/squadre`} variant="secondary">
              ✏️ Squadre e giocatori
            </ButtonLink>
          </div>
        )}
      </div>

      {campione && (
        <Card className="border-2 border-amber-400 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">Vincitore</p>
          <p className="flex items-center justify-center gap-2 text-xl font-bold">
            🏆 {stemma(campione, 36)} {nomeSquadra.get(campione)}
          </p>
        </Card>
      )}

      {eliminazione && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Tabellone</h2>
          <div className="-mx-4 overflow-x-auto px-4 pb-2">
            <div className="flex gap-3">
              {tab.map((incroci, t) => (
                <div key={t} className="flex w-56 shrink-0 flex-col justify-around gap-3">
                  <p className="text-center text-xs font-semibold uppercase tracking-wide text-zinc-500">{nomeTurno(t + 1, tab.length)}</p>
                  {incroci.map((inc) => (
                    <IncrocioCard key={inc.posizione} inc={inc} nome={nomeSquadra} stemma={stemma} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {!eliminazione && (
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Classifica</h2>
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm tabular-nums">
            <thead className="text-xs text-zinc-500">
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-3 py-2 text-left font-medium">#</th>
                <th className="py-2 text-left font-medium">Squadra</th>
                <th className="px-1.5 py-2 font-medium">G</th>
                <th className="px-1.5 py-2 font-medium">V</th>
                <th className="px-1.5 py-2 font-medium">N</th>
                <th className="px-1.5 py-2 font-medium">P</th>
                <th className="px-1.5 py-2 font-medium">DR</th>
                <th className="px-3 py-2 font-medium">Pt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {tabella.map((r, i) => (
                <tr key={r.chiave}>
                  <td className="px-3 py-2 text-zinc-500">{i + 1}</td>
                  <td className="py-2">
                    <span className="flex items-center gap-2 font-medium">
                      {stemma(r.chiave, 24)}
                      {r.nome}
                    </span>
                  </td>
                  <td className="px-1.5 py-2 text-center">{r.g}</td>
                  <td className="px-1.5 py-2 text-center">{r.v}</td>
                  <td className="px-1.5 py-2 text-center">{r.n}</td>
                  <td className="px-1.5 py-2 text-center">{r.p}</td>
                  <td className="px-1.5 py-2 text-center">{r.gf - r.gs > 0 ? `+${r.gf - r.gs}` : r.gf - r.gs}</td>
                  <td className="px-3 py-2 text-center font-bold">{r.punti}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>
      )}

      {marcatori.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Marcatori</h2>
          <Card className="divide-y divide-zinc-100 p-0 dark:divide-zinc-800">
            {marcatori.map(([pid, n]) => {
              const g = giocatori.get(pid)!
              return (
                <div key={pid} className="flex items-center justify-between gap-2 px-4 py-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: g.colore }} />
                    <span className="truncate">{g.nome}</span>
                    <span className="shrink-0 text-xs text-zinc-500">{g.squadra}</span>
                  </span>
                  <span className="font-semibold tabular-nums">⚽ {n}</span>
                </div>
              )
            })}
          </Card>
        </section>
      )}

      {!eliminazione && (
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Giornate</h2>
        {[...perGiornata].map(([turno, ms]) => (
          <Card key={turno} className="divide-y divide-zinc-100 p-0 dark:divide-zinc-800">
            <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Giornata {turno}</p>
            {ms.map((m) => (
              <Link key={m._id} href={`/partite/${m._id}`} className="flex items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800">
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 font-medium">
                    {stemma(m.chiaveA)}
                    <span className="truncate">{m.nomeA}</span>
                    <span className="text-zinc-400">–</span>
                    {stemma(m.chiaveB)}
                    <span className="truncate">{m.nomeB}</span>
                  </span>
                  <span className="block text-xs capitalize text-zinc-500">
                    {formatData(m.data, breve)} · {m.luogo}
                  </span>
                </span>
                {m.stato === 'giocata' && m.risultato?.golA != null ? (
                  <span className="shrink-0 font-bold tabular-nums">
                    {m.risultato.golA} – {m.risultato.golB}
                  </span>
                ) : (
                  <StatoBadge match={m} />
                )}
              </Link>
            ))}
          </Card>
        ))}
      </section>
      )}

      {me.isAdmin && (
        <form action={eliminaTorneo.bind(null, torneo._id)} className="text-center">
          <SubmitButton
            className="text-sm text-red-600 hover:underline"
            pendingText="Elimino…"
            confirm={`Eliminare "${torneo.nome}" con tutte le sue partite, anche quelle già giocate?`}
          >
            Elimina il torneo
          </SubmitButton>
        </form>
      )}
    </div>
  )
}

// Un incrocio del tabellone: le due squadre (o chi deve ancora arrivare), il risultato e chi passa.
// Foto della squadra o, senza foto, il suo colore.
function StemmaSquadra({ colore, foto, size }: { colore?: string; foto?: string | null; size: number }) {
  return foto ? (
    // eslint-disable-next-line @next/next/no-img-element -- miniatura già ridimensionata dal CDN di Sanity
    <img src={foto} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="shrink-0 rounded-full" style={{ width: size * 0.55, height: size * 0.55, background: colore ?? '#d4d4d8' }} />
  )
}

function IncrocioCard({ inc, nome, stemma }: { inc: Incrocio<Match>; nome: Map<string, string>; stemma: (chiave: string | undefined) => ReactNode }) {
  const m = inc.partita
  const riga = (chiave: string | undefined, gol: number | undefined) => (
    <div className={`flex items-center justify-between gap-2 px-3 py-1.5 text-sm ${chiave && inc.vincitore === chiave ? 'font-bold' : ''}`}>
      <span className="flex min-w-0 items-center gap-1.5">
        {stemma(chiave)}
        <span className={`truncate ${chiave ? '' : 'italic text-zinc-400'}`}>{chiave ? nome.get(chiave) : inc.bye ? '—' : 'da decidere'}</span>
      </span>
      {gol != null && <span className="tabular-nums">{gol}</span>}
    </div>
  )
  const giocata = m?.stato === 'giocata' && m.risultato?.golA != null
  const contenuto = (
    <>
      {riga(inc.a, giocata ? m!.risultato!.golA : undefined)}
      <div className="border-t border-zinc-100 dark:border-zinc-800" />
      {riga(inc.b, giocata ? m!.risultato!.golB : undefined)}
      <p className="border-t border-zinc-100 px-3 py-1 text-[11px] capitalize text-zinc-500 dark:border-zinc-800">
        {inc.bye
          ? 'passa direttamente'
          : giocata && m!.risultato!.golA === m!.risultato!.golB
            ? `pareggio · passa ${nome.get(inc.vincitore ?? '') ?? '?'}`
            : m
              ? formatData(m.data, breve)
              : 'in attesa dei risultati'}
      </p>
    </>
  )
  return m ? (
    <Link href={`/partite/${m._id}`} className="block overflow-hidden rounded-xl border border-zinc-200 bg-white hover:border-green-600 dark:border-zinc-800 dark:bg-zinc-900">
      {contenuto}
    </Link>
  ) : (
    <div className="overflow-hidden rounded-xl border border-dashed border-zinc-300 bg-white/60 dark:border-zinc-700 dark:bg-zinc-900/60">{contenuto}</div>
  )
}
