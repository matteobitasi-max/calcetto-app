import Link from 'next/link'
import { Suspense } from 'react'
import { getMemberships, requirePlayer } from '@/lib/player'
import { getTorneiDelleLeghe } from '@/lib/tornei'
import { avatarUrl } from '@/lib/image'
import { Stemma } from '@/components/lega-menu'
import { PallinoAdmin } from '@/components/pallino-admin'
import { Card, Loading, PageTitle } from '@/components/ui'

// I miei tornei: quelli di tutte le mie leghe, non solo della lega attiva. Prima quelli in corso.
export default function TorneiPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Elenco />
    </Suspense>
  )
}

async function Elenco() {
  await requirePlayer()
  const mie = await getMemberships()
  const mioIn = new Map(mie.map((m) => [m.lega._id, m._id]))
  const tornei = await getTorneiDelleLeghe(mie.map((m) => m.lega._id))
  const concluso = (t: (typeof tornei)[number]) => t.partite > 0 && t.giocate === t.partite
  const ordinati = [...tornei.filter((t) => !concluso(t)), ...tornei.filter(concluso)]

  return (
    <>
      <PageTitle
        action={
          mie.some((m) => m.isAdmin) && (
            <Link href="/tornei/nuovo?scegli=1" className="rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">
              ＋ Nuovo torneo
            </Link>
          )
        }
      >
        🏆 I miei tornei
      </PageTitle>
      {ordinati.length === 0 ? (
        <Card className="text-center text-sm text-zinc-500">Nessun torneo nelle tue leghe.</Card>
      ) : (
        <Card className="divide-y divide-zinc-100 p-0 dark:divide-zinc-800">
          {ordinati.map((t) => {
            const io = mioIn.get(t.legaId)
            const mia = t.squadre.find((s) => s.giocatori.some((g) => g._id === io))
            return (
              <Link key={t._id} href={`/tornei/${t._id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                <Stemma lega={{ nome: t.lega.nome, logo: avatarUrl(t.lega.logo, 64) }} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{t.nome}</span>
                  <span className="block truncate text-xs text-zinc-500">
                    🏟️ {t.lega.nome} · {t.squadre.length} squadre · {t.giocate}/{t.partite} giocate
                  </span>
                  {mia && (
                    <span className="mt-0.5 flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
                      Giochi nei {mia.nome}
                      {mia.capitanoId === io && <PallinoAdmin title="Capitano della squadra" />}
                    </span>
                  )}
                </span>
                <span className={`shrink-0 text-xs font-semibold ${concluso(t) ? 'text-zinc-500' : 'text-green-700 dark:text-green-500'}`}>
                  {concluso(t) ? 'Concluso' : 'In corso'}
                </span>
              </Link>
            )
          })}
        </Card>
      )}
    </>
  )
}
