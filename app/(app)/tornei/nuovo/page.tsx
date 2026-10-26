import Link from 'next/link'
import { Suspense } from 'react'
import { displayName, getCurrentPlayer, getMemberships, requireAdmin, requireIn } from '@/lib/player'
import { getPlayers } from '@/lib/matches'
import { forza } from '@/lib/teams'
import { puoCreareTornei } from '@/lib/tornei'
import { avatarUrl } from '@/lib/image'
import { Admin, Stemma } from '@/components/lega-menu'
import { Card, Loading, PageTitle } from '@/components/ui'
import { TorneoForm } from './torneo-form'

export default function NuovoTorneoPage({ searchParams }: PageProps<'/tornei/nuovo'>) {
  return (
    <>
      <PageTitle>🏆 Nuovo torneo</PageTitle>
      <Suspense fallback={<Loading />}>
        <Form searchParams={searchParams} />
      </Suspense>
    </>
  )
}

// Cosa sblocca il Pro: si vede anche senza, per far venire voglia.
function VetrinaPro() {
  return (
    <Card className="space-y-3 text-center">
      <span className="inline-block rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-zinc-900">PRO</span>
      <h2 className="text-lg font-bold">Organizza tornei con la tua lega</h2>
      <ul className="space-y-1 text-left text-sm text-zinc-600 dark:text-zinc-300">
        <li>⚖️ Squadre fisse, bilanciate in automatico</li>
        <li>📅 Calendario del girone generato da solo</li>
        <li>📊 Classifica, marcatori e risultati sempre aggiornati</li>
      </ul>
      <p className="text-sm text-zinc-500">I tornei arrivano presto con la versione Pro.</p>
      <Link href="/pro" className="inline-block text-sm font-semibold text-green-700 hover:underline dark:text-green-400">
        Scopri tutto il Pro ›
      </Link>
    </Card>
  )
}

async function Form({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ lega, giorno, scegli }, mie, attiva, pro] = await Promise.all([searchParams, getMemberships(), getCurrentPlayer(), puoCreareTornei()])
  if (!pro) return <VetrinaPro />
  const organizzate = mie.filter((m) => m.isAdmin)
  const giornoScelto = typeof giorno === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(giorno) ? giorno : undefined

  // Come per una nuova partita: la lega attiva se la organizzo, altrimenti si sceglie.
  if (typeof lega !== 'string' && organizzate.length > 1 && (scegli || !attiva?.isAdmin)) {
    return (
      <Card className="space-y-1">
        <p className="px-3 pb-1 font-semibold">In quale lega?</p>
        {organizzate.map((m) => (
          <Link
            key={m.lega._id}
            href={`/tornei/nuovo?lega=${m.lega._id}${giornoScelto ? `&giorno=${giornoScelto}` : ''}`}
            className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <Stemma lega={{ nome: m.lega.nome, logo: avatarUrl(m.lega.logo, 64) }} size={28} />
            <span className="min-w-0 flex-1 truncate font-medium">{m.lega.nome}</span>
            <Admin />
            <span className="text-zinc-400">›</span>
          </Link>
        ))}
      </Card>
    )
  }
  const admin =
    typeof lega === 'string' ? await requireIn(lega, 'organizzatore') : attiva?.isAdmin || !organizzate.length ? await requireAdmin() : organizzate[0]
  const rosa = (await getPlayers(admin.lega._id))
    .filter((p) => p.attivo !== false)
    .map((p) => ({ id: p._id, nome: displayName(p), forza: forza(p), ruolo: p.ruolo }))

  return (
    <>
      {mie.length > 1 && (
        <p className="mb-3 text-sm text-zinc-500">
          Nella lega <b>{admin.lega.nome}</b>
          {organizzate.length > 1 && (
            <>
              {' · '}
              <Link href="/tornei/nuovo?scegli=1" className="font-medium text-green-700 hover:underline dark:text-green-400">
                Cambia
              </Link>
            </>
          )}
        </p>
      )}
      {rosa.length < 2 ? (
        <Card className="text-sm text-zinc-500">Servono almeno 2 giocatori nella rosa per fare un torneo.</Card>
      ) : (
        <TorneoForm legaId={admin.lega._id} rosa={rosa} inizio={giornoScelto ? `${giornoScelto}T20:30` : undefined} />
      )}
    </>
  )
}
