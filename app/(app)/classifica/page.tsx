import Link from 'next/link'
import { Suspense } from 'react'
import { displayName, requirePlayer, type Player } from '@/lib/player'
import { getAllStats, getPartitePunteggio, getPlayers, type PlayerStats } from '@/lib/matches'
import { PUNTI, classifica, type RigaClassifica } from '@/lib/punteggio'
import { Avatar, Card, Loading, PageTitle, PlayerBadge } from '@/components/ui'

export default function ClassificaPage() {
  return (
    <>
      <PageTitle>Classifica</PageTitle>
      <Suspense fallback={<Loading />}>
        <Classifiche />
      </Suspense>
    </>
  )
}

type Riga = { player: Player; s: PlayerStats }

async function Classifiche() {
  const me = await requirePlayer()
  const [players, stats, partite] = await Promise.all([getPlayers(me.lega._id), getAllStats(me.lega._id), getPartitePunteggio(me.lega._id)])
  const righe: Riga[] = players.flatMap((player) => {
    const s = stats.get(player._id)
    return s && s.giocate > 0 ? [{ player, s }] : []
  })

  if (righe.length === 0) {
    return <Card className="text-sm text-zinc-500">Le classifiche compariranno dopo la prima partita con il risultato.</Card>
  }

  const perc = (s: PlayerStats) => Math.round((s.vinte / s.giocate) * 100)

  const giocatori = new Map(players.map((p) => [p._id, p]))
  const generale = classifica(partite).filter((r) => giocatori.has(r.id))

  return (
    <div className="space-y-4">
      <Generale righe={generale} giocatori={giocatori} mioId={me._id} />
      <Tabella
        titolo="⚽ Marcatori"
        righe={righe.filter((r) => r.s.gol > 0).sort((a, b) => b.s.gol - a.s.gol || a.s.giocate - b.s.giocate)}
        valore={(s) => s.gol}
        dettaglio={(s) => `${(s.gol / s.giocate).toFixed(1)} a partita`}
      />
      <Tabella
        titolo="🫑 MVP"
        righe={righe.filter((r) => r.s.mvp > 0).sort((a, b) => b.s.mvp - a.s.mvp || a.s.giocate - b.s.giocate)}
        valore={(s) => s.mvp}
        dettaglio={(s) => `su ${s.giocate} partite`}
      />
      <Tabella
        titolo="🏆 Vittorie"
        righe={[...righe].sort((a, b) => perc(b.s) - perc(a.s) || b.s.giocate - a.s.giocate)}
        valore={(s) => `${perc(s)}%`}
        dettaglio={(s) => `${s.vinte}V ${s.pari}P ${s.perse}S`}
      />
      <Tabella
        titolo="🧱 Meno gol subiti"
        righe={[...righe].sort((a, b) => a.s.gs / a.s.giocate - b.s.gs / b.s.giocate)}
        valore={(s) => (s.gs / s.giocate).toFixed(1)}
        dettaglio={(s) => `${s.gs} GS in ${s.giocate} partite`}
      />
    </div>
  )
}

function Tabella({
  titolo,
  righe,
  valore,
  dettaglio,
}: {
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
          <li key={player._id} className="flex items-center gap-3">
            <span className="w-5 text-right text-sm tabular-nums text-zinc-400">{i + 1}</span>
            <Avatar player={player} size={32} />
            <Link href={`/giocatori/${player._id}`} className="min-w-0 flex-1 hover:underline">
              <span className="block truncate text-sm font-medium">{displayName(player)}</span>
              <span className="block text-xs text-zinc-500">{dettaglio(s)}</span>
            </Link>
            <span className="text-lg font-bold tabular-nums">{valore(s)}</span>
          </li>
        ))}
      </ol>
    </Card>
  )
}

const numero = (n: number) => new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(n)
const conSegno = (n: number) => (n > 0 ? '+' : '') + numero(n)

function Freccia({ r }: { r: RigaClassifica }) {
  if (r.posizionePrima == null) return <span title="Nuovo in classifica">🆕</span>
  const salti = r.posizionePrima - r.posizione
  if (salti > 0)
    return (
      <span className="font-bold text-green-600" title={`Su di ${salti} posizion${salti === 1 ? 'e' : 'i'}`}>
        ↑{salti > 1 && <sub>{salti}</sub>}
      </span>
    )
  if (salti < 0)
    return (
      <span className="font-bold text-red-600" title={`Giù di ${-salti} posizion${salti === -1 ? 'e' : 'i'}`}>
        ↓{salti < -1 && <sub>{-salti}</sub>}
      </span>
    )
  return (
    <span className="font-bold text-zinc-400" title="Stessa posizione">
      =
    </span>
  )
}

// Classifica generale a punti, con l'andamento rispetto alla partita precedente.
function Generale({ righe, giocatori, mioId }: { righe: RigaClassifica[]; giocatori: Map<string, Player>; mioId: string }) {
  if (righe.length === 0) return null
  return (
    <Card>
      <h2 className="mb-1 font-semibold">🏅 Classifica generale</h2>
      <p className="mb-3 text-xs text-zinc-500">Punti totali · freccia: rispetto a prima dell&apos;ultima partita</p>
      <ol className="space-y-2">
        {righe.map((r) => {
          const p = giocatori.get(r.id)!
          return (
            <li key={r.id} className={`flex items-center gap-2 rounded-lg px-1 py-1 ${r.id === mioId ? 'bg-green-50 dark:bg-green-950' : ''}`}>
              <span className="w-5 text-right text-sm font-semibold tabular-nums text-zinc-500">{r.posizione}</span>
              <span className="w-6 text-center text-sm">
                <Freccia r={r} />
              </span>
              <Avatar player={p} size={32} />
              <Link href={`/giocatori/${p._id}`} className="min-w-0 flex-1 hover:underline">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-sm font-medium">{displayName(p)}</span>
                  <PlayerBadge badge={p.badge} />
                </span>
                <span className="block text-xs text-zinc-500">
                  {r.giocate} partit{r.giocate === 1 ? 'a' : 'e'}
                  {r.ultima != null && ` · ultima ${conSegno(r.ultima)}`}
                </span>
              </Link>
              <span className="text-lg font-bold tabular-nums">{numero(r.punti)}</span>
            </li>
          )
        })}
      </ol>
      <details className="mt-3 text-xs text-zinc-500">
        <summary className="cursor-pointer">Come si calcola</summary>
        <p className="mt-2">
          Per ogni partita: vittoria {conSegno(PUNTI.vittoria)}, pareggio {conSegno(PUNTI.pareggio)}, sconfitta 0, ogni gol fatto{' '}
          {conSegno(PUNTI.gol)}, MVP 🫑 {conSegno(PUNTI.mvp)}, ogni gol subito dalla squadra {conSegno(PUNTI.golSubito)}. A pari punti
          è davanti chi ha giocato meno partite.
        </p>
      </details>
    </Card>
  )
}
