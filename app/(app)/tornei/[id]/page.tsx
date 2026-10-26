import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense, type ReactNode } from 'react'
import { chiudiIscrizioni, eliminaTorneo } from '@/app/actions'
import { displayName, membroDi } from '@/lib/player'
import { getPartiteTorneo, type Match } from '@/lib/matches'
import { getTorneo, iscrizioniAperte } from '@/lib/tornei'
import { classifica } from '@/lib/girone'
import { nomeTurno, tabellone, type Incrocio } from '@/lib/tabellone'
import { getT } from '@/lib/lingua'
import type { T } from '@/lib/i18n'
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
  const [partite, t] = await Promise.all([getPartiteTorneo(torneo._id), getT()])

  const colore = new Map(torneo.squadre.map((s) => [s._key, s.colore]))
  const foto = new Map(torneo.squadre.map((s) => [s._key, avatarUrl(s.logo, 96)]))
  const stemma = (chiave: string | undefined, size = 20) => <StemmaSquadra colore={chiave ? colore.get(chiave) : undefined} foto={chiave ? foto.get(chiave) : null} size={size} />
  const nomeSquadra = new Map(torneo.squadre.map((s) => [s._key, s.nome]))
  const risultati = (ms: Match[]) =>
    ms.filter((m) => m.stato === 'giocata').map((m) => ({ chiaveA: m.chiaveA, chiaveB: m.chiaveB, golA: m.risultato?.golA, golB: m.risultato?.golB }))

  // Marcatori del torneo, con la squadra di ognuno.
  const giocatori = new Map(torneo.squadre.flatMap((s) => s.giocatori.map((g) => [g._id, { nome: displayName(g), squadra: s.nome, colore: s.colore }] as const)))
  const gol = new Map<string, number>()
  for (const m of partite) for (const g of m.marcatori) gol.set(g.giocatoreId, (gol.get(g.giocatoreId) ?? 0) + g.gol)
  const marcatori = [...gol].filter(([pid]) => giocatori.has(pid)).sort((a, b) => b[1] - a[1]).slice(0, 10)

  const giocate = partite.filter((m) => m.stato === 'giocata').length
  const ibrido = torneo.formato === 'gironi'
  const conTabellone = torneo.formato === 'eliminazione' || ibrido
  const deiGironi = ibrido ? partite.filter((m) => m.fase === 'gironi') : torneo.formato === 'girone' ? partite : []
  const finale = ibrido ? partite.filter((m) => m.fase === 'eliminazione') : torneo.formato === 'eliminazione' ? partite : []
  // Gironi + tabellone: il tabellone c'è quando i gironi sono finiti (primoTurno salvato).
  const chiaviTabellone = ibrido ? (torneo.primoTurno ?? []).filter(Boolean) : torneo.squadre.map((s) => s._key)
  const tab =
    conTabellone && chiaviTabellone.length >= 2
      ? tabellone(
          chiaviTabellone,
          finale.map((m) => ({ ...m, golA: m.risultato?.golA, golB: m.risultato?.golB })),
          torneo.primoTurno,
        )
      : []
  const campione = tab.at(-1)?.[0]?.vincitore
  const gironi = ibrido ? [...new Set(torneo.squadre.map((s) => s.girone).filter(Boolean))].sort() as string[] : []
  const formato =
    torneo.formato === 'eliminazione'
      ? t('Eliminazione diretta')
      : ibrido
        ? (torneo.qualificate ?? 2) === 1
          ? t('{n} gironi + tabellone (passa la prima)', { n: gironi.length })
          : t('{n} gironi + tabellone (passano le prime 2)', { n: gironi.length })
        : torneo.andataRitorno
          ? t('Girone all’italiana (andata e ritorno)')
          : t('Girone all’italiana')

  // Classifica di un gruppo di squadre; `passano`: quante si qualificano (evidenziate).
  const tabellaClassifica = (squadre: typeof torneo.squadre, ms: Match[], passano = 0) => (
    <Card className="overflow-x-auto p-0">
      <table className="w-full text-sm tabular-nums">
        <thead className="text-xs text-zinc-500">
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th className="px-3 py-2 text-left font-medium">#</th>
            <th className="py-2 text-left font-medium">{t('Squadra')}</th>
            <th className="px-1.5 py-2 font-medium">{t('G|giocate')}</th>
            <th className="px-1.5 py-2 font-medium">{t('V|vinte')}</th>
            <th className="px-1.5 py-2 font-medium">{t('N|pareggiate')}</th>
            <th className="px-1.5 py-2 font-medium">{t('P|perse')}</th>
            <th className="px-1.5 py-2 font-medium">{t('DR')}</th>
            <th className="px-3 py-2 font-medium">{t('Pt')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {classifica(squadre, risultati(ms), torneo.puntiVittoria, torneo.puntiPareggio).map((r, i) => (
            <tr key={r.chiave} className={i < passano ? 'bg-green-50 dark:bg-green-950/40' : ''}>
              <td className={`px-3 py-2 ${i < passano ? 'font-bold text-green-700 dark:text-green-400' : 'text-zinc-500'}`}>{i + 1}</td>
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
  )

  // Le partite divise per giornata.
  const listaGiornate = (ms: Match[], prefisso = '') => {
    const perGiornata = new Map<number, Match[]>()
    for (const m of ms) perGiornata.set(m.turno ?? 0, [...(perGiornata.get(m.turno ?? 0) ?? []), m])
    return [...perGiornata].map(([turno, lista]) => (
      <Card key={turno} className="divide-y divide-zinc-100 p-0 dark:divide-zinc-800">
        <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {prefisso}
          {t('Giornata {n}', { n: turno })}
        </p>
        {lista.map((m) => (
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
                {t.data(m.data, breve)} · {m.luogo}
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
    ))
  }

  const titolo = (testo: string) => <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{testo}</h2>
  const aperte = iscrizioniAperte(torneo)
  const nomeCapitano = (s: (typeof torneo.squadre)[number]) => {
    const c = s.giocatori.find((g) => g._id === s.capitanoId)
    return c ? displayName(c) : null
  }

  return (
    <div className="space-y-4 pb-8">
      <div>
        <Link href="/tornei" className="text-sm text-green-700 hover:underline dark:text-green-400">
          ← {t('Tornei')}
        </Link>
        <h1 className="mt-1 text-xl font-bold">🏆 {torneo.nome}</h1>
        <p className="text-sm text-zinc-500">
          🏟️ {me.lega.nome} · {formato} · {t('{n}/{tot} partite giocate', { n: giocate, tot: partite.length })}
        </p>
        {me.isAdmin && (
          <div className="mt-2">
            <ButtonLink href={`/tornei/${torneo._id}/squadre`} variant="secondary">
              ✏️ {t('Squadre e giocatori')}
            </ButtonLink>
          </div>
        )}
      </div>

      {campione && (
        <Card className="border-2 border-amber-400 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">{t('Vincitore')}</p>
          <p className="flex items-center justify-center gap-2 text-xl font-bold">
            🏆 {stemma(campione, 36)} {nomeSquadra.get(campione)}
          </p>
        </Card>
      )}

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          {titolo(t('Squadre'))}
          <span className={`text-xs font-semibold ${aperte ? 'text-green-700 dark:text-green-500' : 'text-zinc-500'}`}>
            {aperte ? t('Iscrizioni aperte') : t('Iscrizioni chiuse')}
          </span>
        </div>
        <Card className="divide-y divide-zinc-100 p-0 dark:divide-zinc-800">
          {torneo.squadre.map((s) => {
            const mia = s.giocatori.some((g) => g._id === me._id)
            return (
              <Link
                key={s._key}
                href={`/tornei/${torneo._id}/squadra/${s._key}`}
                className={`flex items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 ${mia ? 'bg-green-50 dark:bg-green-950/40' : ''}`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  {stemma(s._key, 28)}
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {s.nome}
                      {mia && <span className="ml-1 text-xs font-normal text-green-700 dark:text-green-400">· {t('la tua squadra')}</span>}
                    </span>
                    <span className="block truncate text-xs text-zinc-500">
                      {nomeCapitano(s) && `🅐 ${nomeCapitano(s)} · `}
                      {t.n(s.giocatori.length, '{n}{max} giocatore', '{n}{max} giocatori', { max: torneo.maxGiocatori ? `/${torneo.maxGiocatori}` : '' })}
                    </span>
                  </span>
                </span>
                {/* Matita: l'organizzatore su tutte le squadre, il capitano sulla sua */}
                {me.isAdmin || s.capitanoId === me._id ? (
                  <span
                    aria-label={t('Gestisci {squadra}', { squadra: s.nome })}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-base dark:bg-zinc-800"
                  >
                    ✏️
                  </span>
                ) : (
                  <span className="shrink-0 text-zinc-400">›</span>
                )}
              </Link>
            )
          })}
        </Card>
        {me.isAdmin && (
          <form action={chiudiIscrizioni.bind(null, torneo._id, !torneo.iscrizioniChiuse)} className="text-right">
            <SubmitButton className="text-xs font-medium text-zinc-500 hover:underline" pendingText="…">
              {torneo.iscrizioniChiuse ? `🔓 ${t('Riapri le iscrizioni')}` : `🔒 ${t('Chiudi le iscrizioni')}`}
            </SubmitButton>
          </form>
        )}
      </section>

      {conTabellone && (
        <section className="space-y-2">
          {titolo(ibrido ? t('Fase finale') : t('Tabellone'))}
          {tab.length ? (
            <div className="-mx-4 overflow-x-auto px-4 pb-2">
              <div className="flex gap-3">
                {tab.map((incroci, i) => (
                  <div key={i} className="flex w-56 shrink-0 flex-col justify-around gap-3">
                    <p className="text-center text-xs font-semibold uppercase tracking-wide text-zinc-500">{nomeTurno(i + 1, tab.length, t)}</p>
                    {incroci.map((inc) => (
                      <IncrocioCard key={inc.posizione} inc={inc} nome={nomeSquadra} stemma={stemma} t={t} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Card className="text-sm text-zinc-500">
              {(torneo.qualificate ?? 2) === 1
                ? t('Il tabellone si crea da solo quando sono finite tutte le partite dei gironi: passa la prima di ogni girone, con incroci tra gironi diversi.')
                : t('Il tabellone si crea da solo quando sono finite tutte le partite dei gironi: passano le prime 2 di ogni girone, con incroci tra gironi diversi.')}
            </Card>
          )}
        </section>
      )}

      {torneo.formato === 'girone' && (
        <section className="space-y-2">
          {titolo(t('Classifica'))}
          {tabellaClassifica(torneo.squadre, deiGironi)}
        </section>
      )}

      {gironi.map((l) => (
        <section key={l} className="space-y-2">
          {titolo(t('Girone {g}', { g: l }))}
          {tabellaClassifica(
            torneo.squadre.filter((s) => s.girone === l),
            deiGironi.filter((m) => m.girone === l),
            torneo.qualificate ?? 2,
          )}
        </section>
      ))}

      {marcatori.length > 0 && (
        <section className="space-y-2">
          {titolo(t('Marcatori'))}
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

      {torneo.formato === 'girone' && (
        <section className="space-y-2">
          {titolo(t('Giornate'))}
          {listaGiornate(deiGironi)}
        </section>
      )}
      {gironi.map((l) => (
        <section key={l} className="space-y-2">
          {titolo(t('Partite del girone {g}', { g: l }))}
          {listaGiornate(deiGironi.filter((m) => m.girone === l), `${t('Girone {g}', { g: l })} · `)}
        </section>
      ))}

      {me.isAdmin && (
        <form action={eliminaTorneo.bind(null, torneo._id)} className="text-center">
          <SubmitButton
            className="text-sm text-red-600 hover:underline"
            pendingText={t('Elimino…')}
            confirm={t('Eliminare “{nome}” con tutte le sue partite, anche quelle già giocate?', { nome: torneo.nome })}
          >
            {t('Elimina il torneo')}
          </SubmitButton>
        </form>
      )}
    </div>
  )
}

// Foto della squadra o, senza foto, il suo colore.
function StemmaSquadra({ colore, foto, size }: { colore?: string; foto?: string | null; size: number }) {
  return foto ? (
    // eslint-disable-next-line @next/next/no-img-element -- miniatura già ridimensionata dal CDN di Sanity
    <img src={foto} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="shrink-0 rounded-full" style={{ width: size * 0.55, height: size * 0.55, background: colore ?? '#d4d4d8' }} />
  )
}

// Un incrocio del tabellone: le due squadre (o chi deve ancora arrivare), il risultato e chi passa.
function IncrocioCard({ inc, nome, stemma, t }: { inc: Incrocio<Match>; nome: Map<string, string>; stemma: (chiave: string | undefined) => ReactNode; t: T }) {
  const m = inc.partita
  const riga = (chiave: string | undefined, gol: number | undefined) => (
    <div className={`flex items-center justify-between gap-2 px-3 py-1.5 text-sm ${chiave && inc.vincitore === chiave ? 'font-bold' : ''}`}>
      <span className="flex min-w-0 items-center gap-1.5">
        {stemma(chiave)}
        <span className={`truncate ${chiave ? '' : 'italic text-zinc-400'}`}>{chiave ? nome.get(chiave) : inc.bye ? '—' : t('da decidere')}</span>
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
          ? t('passa direttamente')
          : giocata && m!.risultato!.golA === m!.risultato!.golB
            ? t('pareggio · passa {squadra}', { squadra: nome.get(inc.vincitore ?? '') ?? '?' })
            : m
              ? t.data(m.data, breve)
              : t('in attesa dei risultati')}
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
