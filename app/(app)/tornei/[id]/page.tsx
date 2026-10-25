import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { eliminaTorneo } from '@/app/actions'
import { displayName, membroDi } from '@/lib/player'
import { getPartiteTorneo, type Match } from '@/lib/matches'
import { getTorneo } from '@/lib/tornei'
import { classifica } from '@/lib/girone'
import { formatData } from '@/lib/dates'
import { SubmitButton } from '@/components/submit-button'
import { Card, Loading, StatoBadge } from '@/components/ui'

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

  // Marcatori del torneo, con la squadra di ognuno.
  const giocatori = new Map(torneo.squadre.flatMap((s) => s.giocatori.map((g) => [g._id, { nome: displayName(g), squadra: s.nome, colore: s.colore }] as const)))
  const gol = new Map<string, number>()
  for (const m of partite) for (const g of m.marcatori) gol.set(g.giocatoreId, (gol.get(g.giocatoreId) ?? 0) + g.gol)
  const marcatori = [...gol].filter(([pid]) => giocatori.has(pid)).sort((a, b) => b[1] - a[1]).slice(0, 10)

  const perGiornata = new Map<number, Match[]>()
  for (const m of partite) perGiornata.set(m.turno ?? 0, [...(perGiornata.get(m.turno ?? 0) ?? []), m])
  const giocate = partite.filter((m) => m.stato === 'giocata').length

  return (
    <div className="space-y-4 pb-8">
      <div>
        <Link href="/tornei" className="text-sm text-green-700 hover:underline dark:text-green-400">
          ← Tornei
        </Link>
        <h1 className="mt-1 text-xl font-bold">🏆 {torneo.nome}</h1>
        <p className="text-sm text-zinc-500">
          🏟️ {me.lega.nome} · Girone all&apos;italiana{torneo.andataRitorno && ' (andata e ritorno)'} · {giocate}/{partite.length} partite giocate
        </p>
      </div>

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
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: r.colore }} />
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

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Giornate</h2>
        {[...perGiornata].map(([turno, ms]) => (
          <Card key={turno} className="divide-y divide-zinc-100 p-0 dark:divide-zinc-800">
            <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Giornata {turno}</p>
            {ms.map((m) => (
              <Link key={m._id} href={`/partite/${m._id}`} className="flex items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800">
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colore.get(m.chiaveA ?? '') }} />
                    <span className="truncate">{m.nomeA}</span>
                    <span className="text-zinc-400">–</span>
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colore.get(m.chiaveB ?? '') }} />
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
