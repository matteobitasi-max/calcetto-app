import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { aggiungimiAllaLega, scegliLega } from '@/app/actions'
import { SubmitButton } from '@/components/submit-button'
import { getCurrentPlayer, getMemberships, getTutteLeLeghe, isTitolare } from '@/lib/player'
import { avatarUrl } from '@/lib/image'
import { Card, Loading, PageTitle } from '@/components/ui'

// Super admin: tutte le leghe dell'app. Il titolare entra in qualsiasi lega con i poteri
// dell'organizzatore, senza diventarne un giocatore.
export default function LeghePage() {
  return (
    <>
      <PageTitle>👑 Tutte le leghe</PageTitle>
      <Suspense fallback={<Loading />}>
        <Elenco />
      </Suspense>
    </>
  )
}

async function Elenco() {
  if (!(await isTitolare())) notFound()
  const [leghe, mie, me] = await Promise.all([getTutteLeLeghe(), getMemberships(), getCurrentPlayer()])
  const mieIds = new Set(mie.map((m) => m.lega._id))

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Entrando in una lega di cui non fai parte vedi tutto e puoi fare quello che fa un organizzatore, comprese le impostazioni. Per gli
        altri non compari: niente scheda in Rosa, convocazioni o classifica. Con <b>Aggiungiti</b> entri invece nella rosa come giocatore e
        organizzatore.
      </p>
      <Card className="divide-y divide-zinc-100 p-0 dark:divide-zinc-800">
        {leghe.map((l) => {
          const logo = avatarUrl(l.logo, 80)
          const attuale = me?.lega._id === l._id
          return (
            <div key={l._id} className="flex items-center">
              <form action={scegliLega.bind(null, l._id, '/')} className="min-w-0 flex-1">
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  {logo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- miniatura già ridimensionata dal CDN di Sanity
                    <img src={logo} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-600 font-bold text-white">
                      {l.nome.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{l.nome}</span>
                    <span className="block text-xs text-zinc-500">
                      {l.giocatori} giocator{l.giocatori === 1 ? 'e' : 'i'} · {l.partite} partit{l.partite === 1 ? 'a' : 'e'}
                      {mieIds.has(l._id) ? ' · ci giochi' : ''}
                    </span>
                  </span>
                  {attuale ? (
                    <span className="text-xs font-semibold text-green-700 dark:text-green-500">Attuale</span>
                  ) : (
                    <span className="text-zinc-400">›</span>
                  )}
                </button>
              </form>
              {!mieIds.has(l._id) && (
                <form action={aggiungimiAllaLega.bind(null, l._id)} className="shrink-0 pr-3">
                  <SubmitButton
                    className="rounded-full bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
                    pendingText="…"
                    confirm={`Entrare nella rosa di ${l.nome} come giocatore e organizzatore?`}
                  >
                    ＋ Aggiungiti
                  </SubmitButton>
                </form>
              )}
            </div>
          )
        })}
      </Card>
    </div>
  )
}
