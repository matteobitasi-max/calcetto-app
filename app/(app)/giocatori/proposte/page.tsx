import Link from 'next/link'
import { Suspense } from 'react'
import { decidiProposta } from '@/app/actions'
import { requireAdmin, SKILLS, type Skill } from '@/lib/player'
import { getPlayers } from '@/lib/matches'
import { formaDellaLega, legaPro } from '@/lib/pro'
import { PARTITE_PER_REVISIONE, type Proposta } from '@/lib/forma'
import { SubmitButton } from '@/components/submit-button'
import { Card, Loading, PageTitle, PlayerRow, buttonClass } from '@/components/ui'

export default function PropostePage() {
  return (
    <>
      <PageTitle>📈 Proposte di voto</PageTitle>
      <Suspense fallback={<Loading />}>
        <Proposte />
      </Suspense>
    </>
  )
}

const numero = (n: number, cifre = 2) => n.toLocaleString('it-IT', { maximumFractionDigits: cifre })

// Pro: ogni PARTITE_PER_REVISIONE partite giocate, per ogni giocatore l'app propone nuovi voti
// (da 0,10 a 0,25 per caratteristica). L'organizzatore approva o scarta.
async function Proposte() {
  const me = await requireAdmin()
  if (!(await legaPro(me.lega._id))) {
    return (
      <Card className="space-y-2 text-sm">
        <p>
          <span className="mr-1 rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-zinc-900">PRO</span>
          Le proposte automatiche dei voti sono una funzione della versione Pro.
        </p>
        <Link href="/giocatori" className="text-green-700 hover:underline dark:text-green-400">
          ← Torna alla rosa
        </Link>
      </Card>
    )
  }
  const [{ proposte, forma }, giocatori] = await Promise.all([formaDellaLega(me.lega._id), getPlayers(me.lega._id)])
  const perId = new Map(giocatori.map((g) => [g._id, g]))

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500">
        Ogni {PARTITE_PER_REVISIONE} partite giocate, l&apos;app guarda gol, MVP, km e risultati rispetto a quanto ci si aspettava dai voti, e propone
        di alzarli o abbassarli un po&apos; (da 0,10 a 0,25 punti). Approvando i voti cambiano; in tutti e due i casi la prossima proposta guarda solo le partite
        nuove.
      </p>
      {proposte.length === 0 && <Card className="text-sm text-zinc-500">Nessuna proposta per ora: servono almeno {PARTITE_PER_REVISIONE} partite giocate dall&apos;ultima revisione.</Card>}
      {proposte.map((p) => {
        const g = perId.get(p.giocatoreId)
        if (!g) return null
        return (
          <Card key={p.giocatoreId} className="space-y-3">
            <PlayerRow player={g} forma={forma.get(g._id)} />
            <ul className="space-y-1 text-sm">
              {(Object.entries(p.modifiche) as [Skill, { da: number; a: number }][]).map(([k, m]) => (
                <li key={k} className="flex items-center justify-between gap-2">
                  <span>{SKILLS[k]}</span>
                  <span className="tabular-nums">
                    {numero(m.da)} →{' '}
                    <b className={m.a > m.da ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      {numero(m.a)} {m.a > m.da ? '↑' : '↓'}
                    </b>
                  </span>
                </li>
              ))}
            </ul>
            <Perche p={p} />
            <div className="flex gap-2">
              <form action={decidiProposta.bind(null, p.giocatoreId, true)} className="flex-1">
                <SubmitButton className={`${buttonClass('primary')} w-full`}>Approva</SubmitButton>
              </form>
              <form action={decidiProposta.bind(null, p.giocatoreId, false)} className="flex-1">
                <SubmitButton className={`${buttonClass('secondary')} w-full`}>Scarta</SubmitButton>
              </form>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

// I numeri da cui nasce la proposta.
function Perche({ p }: { p: Proposta }) {
  const r = p.perche
  const risultati = r.risultati > 0.1 ? 'meglio del previsto' : r.risultati < -0.1 ? 'peggio del previsto' : 'come previsto'
  return (
    <p className="rounded-lg bg-zinc-50 p-2 text-xs text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-300">
      Ultime {Math.min(p.partite, 10)} partite: ⚽ {numero(r.golMedi)} gol a partita (attesi {numero(r.golAttesi)}) · 🫑 {r.mvp} MVP
      {r.kmMedi != null && r.kmAttesi != null && ` · 🏃 ${numero(r.kmMedi)} km (attesi ${numero(r.kmAttesi)})`} · la sua squadra ha fatto{' '}
      {risultati}.
    </p>
  )
}
