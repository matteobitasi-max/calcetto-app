import Link from 'next/link'
import { Suspense } from 'react'
import { decidiProposta } from '@/app/actions'
import { requireAdmin, SKILLS, type Skill } from '@/lib/player'
import { getPlayers } from '@/lib/matches'
import { formaDellaLega, legaPro } from '@/lib/pro'
import { PARTITE_PER_REVISIONE, type Proposta } from '@/lib/forma'
import { SubmitButton } from '@/components/submit-button'
import { Card, Loading, PageTitle, PlayerRow, buttonClass } from '@/components/ui'
import { getT } from '@/lib/lingua'
import type { T } from '@/lib/i18n'

export default async function PropostePage() {
  const t = await getT()
  return (
    <>
      <PageTitle>📈 {t('Proposte di voto')}</PageTitle>
      <Suspense fallback={<Loading />}>
        <Proposte />
      </Suspense>
    </>
  )
}


// Pro: ogni PARTITE_PER_REVISIONE partite giocate, per ogni giocatore l'app propone nuovi voti
// (da 0,10 a 0,25 per caratteristica). L'organizzatore approva o scarta.
async function Proposte() {
  const [me, t] = await Promise.all([requireAdmin(), getT()])
  const numero = (n: number) => t.numero(n, { maximumFractionDigits: 2 })
  if (!(await legaPro(me.lega._id))) {
    return (
      <Card className="space-y-2 text-sm">
        <p>
          <span className="mr-1 rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-zinc-900">PRO</span>
          {t('Le proposte automatiche dei voti sono una funzione della versione Pro.')}
        </p>
        <Link href="/giocatori" className="text-green-700 hover:underline dark:text-green-400">
          ← {t('Torna alla rosa')}
        </Link>
      </Card>
    )
  }
  const [{ proposte, forma }, giocatori] = await Promise.all([formaDellaLega(me.lega._id), getPlayers(me.lega._id)])
  const perId = new Map(giocatori.map((g) => [g._id, g]))

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500">
        {t('Ogni {n} partite giocate, l’app guarda gol, MVP, km e risultati rispetto a quanto ci si aspettava dai voti, e propone di alzarli o abbassarli un po’ (da 0,10 a 0,25 punti). Approvando i voti cambiano; in tutti e due i casi la prossima proposta guarda solo le partite nuove.', { n: PARTITE_PER_REVISIONE })}
      </p>
      {proposte.length === 0 && (
        <Card className="text-sm text-zinc-500">{t('Nessuna proposta per ora: servono almeno {n} partite giocate dall’ultima revisione.', { n: PARTITE_PER_REVISIONE })}</Card>
      )}
      {proposte.map((p) => {
        const g = perId.get(p.giocatoreId)
        if (!g) return null
        return (
          <Card key={p.giocatoreId} className="space-y-3">
            <PlayerRow player={g} forma={forma.get(g._id)} />
            <ul className="space-y-1 text-sm">
              {(Object.entries(p.modifiche) as [Skill, { da: number; a: number }][]).map(([k, m]) => (
                <li key={k} className="flex items-center justify-between gap-2">
                  <span>{t(SKILLS[k])}</span>
                  <span className="tabular-nums">
                    {numero(m.da)} →{' '}
                    <b className={m.a > m.da ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      {numero(m.a)} {m.a > m.da ? '↑' : '↓'}
                    </b>
                  </span>
                </li>
              ))}
            </ul>
            <Perche p={p} t={t} />
            <div className="flex gap-2">
              <form action={decidiProposta.bind(null, p.giocatoreId, true)} className="flex-1">
                <SubmitButton className={`${buttonClass('primary')} w-full`}>{t('Approva')}</SubmitButton>
              </form>
              <form action={decidiProposta.bind(null, p.giocatoreId, false)} className="flex-1">
                <SubmitButton className={`${buttonClass('secondary')} w-full`}>{t('Scarta')}</SubmitButton>
              </form>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

// I numeri da cui nasce la proposta.
function Perche({ p, t }: { p: Proposta; t: T }) {
  const r = p.perche
  const numero = (n: number) => t.numero(n, { maximumFractionDigits: 2 })
  const risultati = r.risultati > 0.1 ? t('meglio del previsto') : r.risultati < -0.1 ? t('peggio del previsto') : t('come previsto')
  return (
    <p className="rounded-lg bg-zinc-50 p-2 text-xs text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-300">
      {t('Ultime {n} partite:', { n: Math.min(p.partite, 10) })} ⚽ {t('{gol} gol a partita (attesi {attesi})', { gol: numero(r.golMedi), attesi: numero(r.golAttesi) })} · 🫑{' '}
      {r.mvp} MVP
      {r.kmMedi != null && r.kmAttesi != null && ` · 🏃 ${t('{km} km (attesi {attesi})', { km: numero(r.kmMedi), attesi: numero(r.kmAttesi) })}`}
      {r.subitiMedi != null && r.subitiAttesi != null &&
        ` · 🛡️ ${t('{gol} gol subiti dalla sua squadra (attesi {attesi})', { gol: numero(r.subitiMedi), attesi: numero(r.subitiAttesi) })}`}{' '}
      ·{' '}
      {t('la sua squadra ha fatto {come}.', { come: risultati })}
    </p>
  )
}
