import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { unisciSchede } from '@/app/actions'
import { displayName, requireIn } from '@/lib/player'
import { getPlayer, getPlayers } from '@/lib/matches'
import { SubmitButton } from '@/components/submit-button'
import { Card, Loading, PageTitle, PlayerRow, buttonClass } from '@/components/ui'

export default function UnisciPage({ params }: PageProps<'/giocatori/[id]/unisci'>) {
  return (
    <>
      <PageTitle>Unisci un doppione</PageTitle>
      <Suspense fallback={<Loading />}>
        <Scelta params={params} />
      </Suspense>
    </>
  )
}

async function Scelta({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const tieni = await getPlayer(id)
  if (!tieni) notFound()
  await requireIn(tieni.legaId, 'organizzatore')
  const altri = (await getPlayers(tieni.legaId!)).filter((p) => p._id !== tieni._id)
  const nome = displayName(tieni)

  return (
    <div className="space-y-4">
      <Card className="space-y-2 text-sm">
        <p>
          Scegli la scheda doppia da unire in <b>{nome}</b>. Account, partite, convocazioni, squadre, gol, MVP e pagamenti passano a{' '}
          <b>{nome}</b>; foto e dati che le mancano vengono presi dal doppione, che poi viene eliminato.
        </p>
        <p className="text-zinc-500">Non si possono unire due schede che hanno fatto l&apos;accesso con account diversi.</p>
        <Link href={`/giocatori/${tieni._id}`} className="text-green-700 hover:underline dark:text-green-400">
          ← Torna a {nome}
        </Link>
      </Card>
      <Card>
        <ul className="space-y-3">
          {altri.map((p) => (
            <li key={p._id}>
              <PlayerRow
                player={p}
                mostraAccesso
                right={
                  <form action={unisciSchede.bind(null, tieni._id, p._id)}>
                    <SubmitButton
                      className={`${buttonClass('secondary')} px-3 py-1 text-xs`}
                      pendingText="Unisco…"
                      confirm={`Unire "${displayName(p)}" in "${nome}"? La scheda "${displayName(p)}" verrà eliminata e non si torna indietro.`}
                    >
                      Unisci qui
                    </SubmitButton>
                  </form>
                }
              />
              {p.email && <p className="ml-12 text-xs text-zinc-400">{p.email}</p>}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
