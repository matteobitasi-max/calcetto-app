import Link from 'next/link'
import { Suspense } from 'react'
import { displayName, requirePlayer, type Player } from '@/lib/player'
import { getAllStats, getKmTotali, getPartitePunteggio, getPlayers, type PlayerStats } from '@/lib/matches'
import { PUNTI, classifica, type RigaClassifica } from '@/lib/punteggio'
import { Avatar, Card, Loading, PageTitle, PlayerBadge } from '@/components/ui'
import { getT } from '@/lib/lingua'
import type { T } from '@/lib/i18n'

export default async function ClassificaPage() {
  const t = await getT()
  return (
    <>
      <PageTitle>{t('Classifica')}</PageTitle>
      <Suspense fallback={<Loading />}>
        <Classifiche />
      </Suspense>
    </>
  )
}

type Riga = { player: Player; s: PlayerStats }

async function Classifiche() {
  const [me, t] = await Promise.all([requirePlayer(), getT()])
  const [players, stats, partite, km] = await Promise.all([
    getPlayers(me.lega._id),
    getAllStats(me.lega._id),
    getPartitePunteggio(me.lega._id),
    getKmTotali(me.lega._id),
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
      <KmPercorsi km={km} giocatori={giocatori} mioId={me._id} t={t} />
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

// Km totali corsi nelle partite (inseriti a mano o presi da Strava / Apple Salute).
function KmPercorsi({ km, giocatori, mioId, t }: { km: Map<string, { km: number; partite: number }>; giocatori: Map<string, Player>; mioId: string; t: T }) {
  const righe = [...km.entries()].filter(([id]) => giocatori.has(id)).sort((a, b) => b[1].km - a[1].km)
  if (righe.length === 0) return null
  const fmt = (n: number) => t.numero(n, { maximumFractionDigits: 1 })
  return (
    <Card>
      <h2 className="mb-3 font-semibold">🏃 {t('Km percorsi')}</h2>
      <ol className="space-y-2">
        {righe.slice(0, 10).map(([id, k], i) => {
          const player = giocatori.get(id)!
          return (
            <li key={id} className={`flex items-center gap-3 rounded-lg px-1 py-1 ${id === mioId ? 'bg-green-50 dark:bg-green-950' : ''}`}>
              <span className="w-5 text-right text-sm tabular-nums text-zinc-400">{i + 1}</span>
              <Avatar player={player} size={32} />
              <Link href={`/giocatori/${id}`} className="min-w-0 flex-1 hover:underline">
                <span className={`block truncate text-sm ${id === mioId ? 'font-extrabold' : 'font-medium'}`}>{displayName(player)}</span>
                <span className="block text-xs text-zinc-500">
                  {t('{km} km a partita', { km: fmt(k.km / k.partite) })} · {t.n(k.partite, '{n} partita', '{n} partite')}
                </span>
              </Link>
              <span className="text-lg font-bold tabular-nums">{fmt(k.km)}</span>
            </li>
          )
        })}
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
