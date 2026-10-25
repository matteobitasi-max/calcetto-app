import Link from 'next/link'
import { Suspense } from 'react'
import { requirePlayer } from '@/lib/player'
import { getTornei } from '@/lib/tornei'
import { Card, Loading, PageTitle } from '@/components/ui'

// I tornei della lega attiva.
export default function TorneiPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Elenco />
    </Suspense>
  )
}

async function Elenco() {
  const me = await requirePlayer()
  const tornei = await getTornei(me.lega._id)
  return (
    <>
      <PageTitle
        action={
          me.isAdmin && (
            <Link href="/tornei/nuovo" className="rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">
              ＋ Nuovo torneo
            </Link>
          )
        }
      >
        🏆 Tornei
      </PageTitle>
      {tornei.length === 0 ? (
        <Card className="text-center text-sm text-zinc-500">Nessun torneo in {me.lega.nome}.</Card>
      ) : (
        <Card className="divide-y divide-zinc-100 p-0 dark:divide-zinc-800">
          {tornei.map((t) => (
            <Link key={t._id} href={`/tornei/${t._id}`} className="flex items-center justify-between gap-2 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800">
              <span className="min-w-0">
                <span className="block truncate font-medium">{t.nome}</span>
                <span className="block text-xs text-zinc-500">
                  {t.squadre.length} squadre · {t.giocate}/{t.partite} partite giocate
                </span>
              </span>
              {t.partite > 0 && t.giocate === t.partite ? (
                <span className="text-xs font-semibold text-zinc-500">Concluso</span>
              ) : (
                <span className="text-xs font-semibold text-green-700 dark:text-green-500">In corso</span>
              )}
            </Link>
          ))}
        </Card>
      )}
    </>
  )
}
