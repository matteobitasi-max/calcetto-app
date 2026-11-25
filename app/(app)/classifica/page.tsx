import Link from 'next/link'
import { Suspense } from 'react'
import { displayName, requirePlayer, type Player } from '@/lib/player'
import { getAllStats, getKmRecord, getKmTotali, getPagelleLega, getPartitePunteggio, getPlayers, getPresenzeAllenamenti, type PlayerStats } from '@/lib/matches'
import { MOTIVI_INDISPONIBILE, indisponibileIl } from '@/lib/roster'
import { isoToRomeLocal } from '@/lib/dates'
import { EtichettaClub, PillScelta } from '@/components/pill-scelta'
import { legaPro } from '@/lib/pro'
import { KmBloccati, KmPercorsi } from '@/components/km-classifica'
import { PUNTI, classifica, type RigaClassifica } from '@/lib/punteggio'
import { Avatar, Card, Loading, PageTitle, PlayerBadge, coloreVoto } from '@/components/ui'
import { getT } from '@/lib/lingua'
import { periodoScelto, stagioniOrdinate, type Periodo } from '@/lib/stagioni'
import type { T } from '@/lib/i18n'

// Statistiche: due viste con la pillola in alto. Di base "Statistiche" nelle leghe Club Allenatore,
// "Classifica" nelle leghe tra amici.
export default async function StatistichePage({ searchParams }: PageProps<'/classifica'>) {
  const t = await getT()
  return (
    <>
      <PageTitle>{t('Statistiche')}</PageTitle>
      <Suspense fallback={<Loading />}>
        <Viste searchParams={searchParams} />
      </Suspense>
    </>
  )
}

async function Viste({ searchParams }: { searchParams: PageProps<'/classifica'>['searchParams'] }) {
  const [{ vista, stagione }, me, t] = await Promise.all([searchParams, requirePlayer(), getT()])
  const club = !!me.lega.club && me.lega.tipo === 'squadra'
  const statistiche = vista === 'statistiche' || (vista !== 'classifica' && club)
  // la stagione da guardare: quella in corso (predefinita), una chiusa o tutte insieme
  const { chiave, periodo } = periodoScelto(stagione, me.lega.stagioni)
  const chiuse = stagioniOrdinate(me.lega.stagioni)
  const href = (v: string, s: string) => `/classifica?vista=${v}${s === 'corso' ? '' : `&stagione=${s}`}`
  const v = statistiche ? 'statistiche' : 'classifica'
  return (
    <div className="space-y-4">
      <PillScelta
        voci={[
          { href: href('classifica', chiave), label: `🏅 ${t('Classifica')}`, attiva: !statistiche },
          { href: href('statistiche', chiave), label: `📊 ${t('Statistiche')}`, attiva: statistiche },
        ]}
      />
      {/* con almeno una stagione chiusa: si sceglie quale guardare */}
      {chiuse.length > 0 && (
        <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 text-sm" aria-label={t('Stagione')}>
          {[
            { k: 'corso', label: t('Stagione in corso') },
            ...chiuse.map((s) => ({ k: s._key, label: s.nome })),
            { k: 'tutte', label: t('Sempre') },
          ].map((x) => (
            <Link
              key={x.k}
              href={href(v, x.k)}
              replace
              scroll={false}
              aria-current={x.k === chiave ? 'page' : undefined}
              className={`shrink-0 rounded-full border px-3 py-1 font-medium ${
                x.k === chiave
                  ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900'
                  : 'border-zinc-300 text-zinc-600 hover:border-zinc-500 dark:border-zinc-700 dark:text-zinc-300'
              }`}
            >
              {x.label}
            </Link>
          ))}
        </nav>
      )}
      {/* una stagione terminata: il suo wrap */}
      {chiuse.some((x) => x._key === chiave) && (
        <Link
          href={`/wrap/${chiave}`}
          className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-fuchsia-600 to-indigo-800 px-4 py-3 text-sm font-bold text-white shadow"
        >
          🎁 {t('Rivedi il wrap della stagione')}
          <span aria-hidden>›</span>
        </Link>
      )}
      {statistiche ? <Statistiche club={club} periodo={periodo} /> : <Classifiche periodo={periodo} />}
    </div>
  )
}

type Riga = { player: Player; s: PlayerStats }

async function Classifiche({ periodo }: { periodo: Periodo }) {
  const [me, t] = await Promise.all([requirePlayer(), getT()])
  const [players, stats, partite, km, record, pro] = await Promise.all([
    getPlayers(me.lega._id),
    getAllStats(me.lega._id, periodo),
    getPartitePunteggio(me.lega._id, periodo),
    getKmTotali(me.lega._id, periodo),
    getKmRecord(me.lega._id, periodo),
    legaPro(me.lega._id),
  ])
  const righe: Riga[] = players.flatMap((player) => {
    const s = stats.get(player._id)
    return s && s.giocate > 0 ? [{ player, s }] : []
  })

  if (righe.length === 0) {
    return <Card className="text-sm text-zinc-500">{t('Le classifiche compariranno dopo la prima partita con il risultato.')}</Card>
  }

  const perc = (s: PlayerStats) => Math.round((s.vinte / s.giocate) * 100)
  const uno = (n: number) => t.numero(n, { minimumFractionDigits: 1, maximumFractionDigits: 1 })

  const giocatori = new Map(players.map((p) => [p._id, p]))
  const generale = classifica(partite).filter((r) => giocatori.has(r.id))

  return (
    <div className="space-y-4">
      <Generale righe={generale} giocatori={giocatori} mioId={me._id} t={t} />
      <Tabella
        mioId={me._id}
        titolo={`⚽ ${t('Marcatori')}`}
        righe={righe.filter((r) => r.s.gol > 0).sort((a, b) => b.s.gol - a.s.gol || a.s.giocate - b.s.giocate)}
        valore={(s) => s.gol}
        dettaglio={(s) => t('{n} a partita', { n: uno(s.gol / s.giocate) })}
      />
      <Tabella
        mioId={me._id}
        titolo="🫑 MVP"
        righe={righe.filter((r) => r.s.mvp > 0).sort((a, b) => b.s.mvp - a.s.mvp || a.s.giocate - b.s.giocate)}
        valore={(s) => s.mvp}
        dettaglio={(s) => t('su {n} partite', { n: s.giocate })}
      />
      <Tabella
        mioId={me._id}
        titolo={`🏆 ${t('Vittorie')}`}
        righe={[...righe].sort((a, b) => perc(b.s) - perc(a.s) || b.s.giocate - a.s.giocate)}
        valore={(s) => `${perc(s)}%`}
        dettaglio={(s) => `${s.vinte}${t('V|vittorie')} ${s.pari}${t('P|pari')} ${s.perse}${t('S|sconfitte')}`}
      />
      {pro ? (
        <KmPercorsi km={km} record={record} giocatori={giocatori} mioId={me._id} t={t} />
      ) : (
        <KmBloccati km={km} giocatori={giocatori} admin={!!me.isAdmin} t={t} />
      )}
      <Tabella
        mioId={me._id}
        titolo={`🧱 ${t('Meno gol subiti')}`}
        righe={[...righe].sort((a, b) => a.s.gs / a.s.giocate - b.s.gs / b.s.giocate)}
        valore={(s) => uno(s.gs / s.giocate)}
        dettaglio={(s) => t('{gs} GS in {n} partite', { gs: s.gs, n: s.giocate })}
      />
    </div>
  )
}

function Tabella({
  mioId,
  titolo,
  righe,
  valore,
  dettaglio,
}: {
  mioId: string
  titolo: string
  righe: Riga[]
  valore: (s: PlayerStats) => string | number
  dettaglio: (s: PlayerStats) => string
}) {
  if (righe.length === 0) return null
  return (
    <Card>
      <h2 className="mb-3 font-semibold">{titolo}</h2>
      <ol className="space-y-2">
        {righe.slice(0, 10).map(({ player, s }, i) => (
          <li
            key={player._id}
            className={`flex items-center gap-3 rounded-lg px-1 py-1 ${player._id === mioId ? 'bg-green-50 dark:bg-green-950' : ''}`}
          >
            <span className="w-5 text-right text-sm tabular-nums text-zinc-400">{i + 1}</span>
            <Avatar player={player} size={32} />
            <Link href={`/giocatori/${player._id}`} className="min-w-0 flex-1 hover:underline">
              <span className={`block truncate text-sm ${player._id === mioId ? 'font-extrabold' : 'font-medium'}`}>{displayName(player)}</span>
              <span className="block text-xs text-zinc-500">{dettaglio(s)}</span>
            </Link>
            <span className="text-lg font-bold tabular-nums">{valore(s)}</span>
          </li>
        ))}
      </ol>
    </Card>
  )
}

function Freccia({ r, t }: { r: RigaClassifica; t: T }) {
  if (r.posizionePrima == null) return <span title={t('Nuovo in classifica')}>🆕</span>
  const salti = r.posizionePrima - r.posizione
  if (salti > 0)
    return (
      <span className="font-bold text-green-600" title={t.n(salti, 'Su di {n} posizione', 'Su di {n} posizioni')}>
        ↑{salti > 1 && <sub>{salti}</sub>}
      </span>
    )
  if (salti < 0)
    return (
      <span className="font-bold text-red-600" title={t.n(-salti, 'Giù di {n} posizione', 'Giù di {n} posizioni')}>
        ↓{salti < -1 && <sub>{-salti}</sub>}
      </span>
    )
  return (
    <span className="font-bold text-zinc-400" title={t('Stessa posizione')}>
      =
    </span>
  )
}

// Classifica generale a punti, con l'andamento rispetto alla partita precedente.
function Generale({ righe, giocatori, mioId, t }: { righe: RigaClassifica[]; giocatori: Map<string, Player>; mioId: string; t: T }) {
  if (righe.length === 0) return null
  const numero = (n: number) => t.numero(n, { maximumFractionDigits: 2 })
  const conSegno = (n: number) => (n > 0 ? '+' : '') + numero(n)
  return (
    <Card>
      <h2 className="mb-1 font-semibold">🏅 {t('Classifica generale')}</h2>
      <p className="mb-3 text-xs text-zinc-500">{t('Punti totali · freccia: rispetto a prima dell’ultima partita')}</p>
      <ol className="space-y-2">
        {righe.map((r) => {
          const p = giocatori.get(r.id)!
          return (
            <li key={r.id} className={`flex items-center gap-2 rounded-lg px-1 py-1 ${r.id === mioId ? 'bg-green-50 dark:bg-green-950' : ''}`}>
              <span className="w-5 text-right text-sm font-semibold tabular-nums text-zinc-500">{r.posizione}</span>
              <span className="w-6 text-center text-sm">
                <Freccia r={r} t={t} />
              </span>
              <Avatar player={p} size={32} />
              <Link href={`/giocatori/${p._id}`} className="min-w-0 flex-1 hover:underline">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className={`truncate text-sm ${r.id === mioId ? 'font-extrabold' : 'font-medium'}`}>{displayName(p)}</span>
                  <PlayerBadge badge={p.badge} />
                </span>
                <span className="block text-xs text-zinc-500">
                  {t.n(r.giocate, '{n} partita', '{n} partite')}
                  {r.ultima != null && ` · ${t('ultima {punti}', { punti: conSegno(r.ultima) })}`}
                </span>
              </Link>
              <span className="text-lg font-bold tabular-nums">{numero(r.punti)}</span>
            </li>
          )
        })}
      </ol>
      <details className="mt-3 text-xs text-zinc-500">
        <summary className="cursor-pointer">{t('Come si calcola')}</summary>
        <p className="mt-2">
          {t(
            'Per ogni partita: vittoria {v}, pareggio {p}, sconfitta 0, ogni gol fatto {g}, MVP 🫑 {mvp}, ogni gol subito dalla squadra {gs}. A pari punti è davanti chi ha giocato meno partite.',
            { v: conSegno(PUNTI.vittoria), p: conSegno(PUNTI.pareggio), g: conSegno(PUNTI.gol), mvp: conSegno(PUNTI.mvp), gs: conSegno(PUNTI.golSubito) },
          )}
        </p>
      </details>
    </Card>
  )
}

// Vista "Statistiche": rendimento di ogni giocatore e, con il Club Allenatore, pagelle, presenze agli
// allenamenti, indisponibili e dati da Veo. Senza Club le parti del Club si vedono, bloccate.
async function Statistiche({ club, periodo }: { club: boolean; periodo: Periodo }) {
  const [me, t] = await Promise.all([requirePlayer(), getT()])
  if (!club) return <StatisticheBloccate legaId={me.isAdmin ? me.lega._id : undefined} t={t} />
  const [players, stats, km, pagelle, allenamenti] = await Promise.all([
    getPlayers(me.lega._id),
    getAllStats(me.lega._id, periodo),
    getKmTotali(me.lega._id, periodo),
    club ? getPagelleLega(me.lega._id, periodo) : new Map<string, { media: number; n: number }>(),
    club ? getPresenzeAllenamenti(me.lega._id, periodo) : { totale: 0, per: new Map<string, number>() },
  ])
  const attivi = players.filter((p) => p.attivo !== false)
  const numero = (n: number) => t.numero(Math.round(n * 10) / 10)
  const righe = attivi
    .map((p) => ({ p, s: stats.get(p._id), km: km.get(p._id), pag: pagelle.get(p._id) }))
    .filter((r) => (r.s?.giocate ?? 0) > 0 || r.pag)
    .sort((a, b) => (b.s?.giocate ?? 0) - (a.s?.giocate ?? 0) || (b.pag?.media ?? 0) - (a.pag?.media ?? 0))
  const oggi = isoToRomeLocal(new Date().toISOString()).slice(0, 10)
  const fuori = attivi.filter((p) => indisponibileIl(p, oggi))
  const bloccato = (testo: string) => (
    <div className="space-y-1 rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-950">
      <p className="text-zinc-500">🔒 {testo}</p>
      <Link href={`/club${me.isAdmin ? `?lega=${me.lega._id}` : ''}`} className="font-semibold text-green-700 hover:underline dark:text-green-400">
        {t('Scopri il Club Allenatore ›')}
      </Link>
    </div>
  )

  return (
    <>
      <Card className="space-y-3">
        <h2 className="font-semibold">📊 {t('Rendimento dei giocatori')}</h2>
        {righe.length === 0 ? (
          <p className="text-sm text-zinc-500">{t('Le statistiche compariranno dopo la prima partita con il risultato.')}</p>
        ) : (
          <div className="-mx-4 overflow-x-auto px-4">
            <table className="w-full min-w-[22rem] text-sm">
              <thead className="text-xs text-zinc-500">
                <tr className="text-right">
                  <th className="py-1 text-left font-medium">{t('Giocatore')}</th>
                  <th className="px-1 font-medium" title={t('Partite giocate')}>{t('Pres.')}</th>
                  <th className="px-1 font-medium">⚽</th>
                  <th className="px-1 font-medium">🫑</th>
                  <th className="px-1 font-medium" title={t('Km a partita')}>{t('km/p')}</th>
                  {club && <th className="pl-1 font-medium" title={t('Media pagelle')}>📝</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {righe.map(({ p, s, km: k, pag }) => (
                  <tr key={p._id} className={`text-right tabular-nums ${p._id === me._id ? 'font-bold' : ''}`}>
                    <td className="max-w-[9rem] truncate py-1.5 text-left">
                      <Link href={`/giocatori/${p._id}`} className="hover:underline">
                        {displayName(p)}
                      </Link>
                    </td>
                    <td className="px-1">{s?.giocate ?? 0}</td>
                    <td className="px-1">{s?.gol ?? 0}</td>
                    <td className="px-1">{s?.mvp ?? 0}</td>
                    <td className="px-1">{k && k.partite ? numero(k.km / k.partite) : '–'}</td>
                    {club && (
                      <td className="pl-1">
                        {pag ? <span className={`rounded px-1 ${coloreVoto(pag.media)}`}>{numero(pag.media)}</span> : '–'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!club && bloccato(t('Media delle pagelle dell’allenatore: con il Club Allenatore.'))}
      </Card>

      <Card className="space-y-3">
        <h2 className="flex items-center gap-2 font-semibold">
          🏃 {t('Presenze agli allenamenti')} <EtichettaClub />
        </h2>
        {!club ? (
          bloccato(t('Quante volte ognuno si è allenato, in percentuale.'))
        ) : allenamenti.totale === 0 ? (
          <p className="text-sm text-zinc-500">{t('Ancora nessun allenamento fatto.')}</p>
        ) : (
          <ol className="space-y-1.5 text-sm">
            {attivi
              .map((p) => ({ p, n: allenamenti.per.get(p._id) ?? 0 }))
              .sort((a, b) => b.n - a.n)
              .map(({ p, n }) => {
                const perc = Math.round((n / allenamenti.totale) * 100)
                return (
                  <li key={p._id} className="grid grid-cols-[1fr_6rem_3rem] items-center gap-2">
                    <span className="truncate">{displayName(p)}</span>
                    <span className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <span className="block h-full rounded-full bg-green-600" style={{ width: `${perc}%` }} />
                    </span>
                    <span className="text-right tabular-nums text-zinc-500">{perc}%</span>
                  </li>
                )
              })}
            <li className="pt-1 text-xs text-zinc-500">{t('Su {n} allenamenti fatti.', { n: allenamenti.totale })}</li>
          </ol>
        )}
      </Card>

      {club && fuori.length > 0 && (
        <Card className="space-y-2">
          <h2 className="font-semibold">🩺 {t('Indisponibili oggi')}</h2>
          <ul className="space-y-1 text-sm">
            {fuori.map((p) => (
              <li key={p._id} className="flex justify-between gap-2">
                <Link href={`/giocatori/${p._id}`} className="truncate hover:underline">
                  {MOTIVI_INDISPONIBILE[p.indisponibile!.motivo].emoji} {displayName(p)}
                </Link>
                <span className="shrink-0 text-zinc-500">
                  {p.indisponibile?.fino ? t('fino al {data}', { data: t.data(`${p.indisponibile.fino}T12:00:00Z`, { day: 'numeric', month: 'short' }) }) : t(MOTIVI_INDISPONIBILE[p.indisponibile!.motivo].label)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="space-y-3">
        <h2 className="flex items-center gap-2 font-semibold">
          🎥 {t('Dati da Veo')} <EtichettaClub />
        </h2>
        {club ? (
          <p className="text-sm text-zinc-500">⏳ {t('In arrivo: km, sprint, velocità, passaggi e tiri di ogni partita registrata con Veo.')}</p>
        ) : (
          bloccato(t('Le statistiche delle partite registrate con le telecamere Veo.'))
        )}
      </Card>
    </>
  )
}

// Senza Club: le Statistiche si vedono solo con il Club Allenatore. Cosa contengono e il link per attivarlo.
function StatisticheBloccate({ legaId, t }: { legaId?: string; t: T }) {
  const voci = [
    t('Rendimento di ogni giocatore: presenze, gol, MVP e km a partita'),
    t('Media delle pagelle dell’allenatore'),
    t('Presenze agli allenamenti, in percentuale'),
    t('Chi è infortunato o squalificato e fino a quando'),
    t('Dati dalle telecamere Veo (in arrivo)'),
  ]
  return (
    <Card className="space-y-4 border-2 border-zinc-900 dark:border-white">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">🔒 {t('Statistiche dell’allenatore')}</h2>
        <EtichettaClub />
      </div>
      <p className="text-sm text-zinc-500">{t('Le statistiche sono una funzione del Club Allenatore. Dentro trovi:')}</p>
      <ul className="space-y-1.5 text-sm">
        {voci.map((v) => (
          <li key={v} className="flex gap-2">
            <span className="font-bold text-green-600">✓</span>
            <span>{v}</span>
          </li>
        ))}
      </ul>
      <Link href={`/club${legaId ? `?lega=${legaId}` : ''}`} className="block rounded-xl bg-zinc-900 py-3 text-center text-sm font-bold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900">
        {t('Scopri Club PRO ›')}
      </Link>
    </Card>
  )
}
