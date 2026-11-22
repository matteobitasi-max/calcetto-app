import Link from 'next/link'
import { Suspense } from 'react'
import { getCurrentPlayer, getMemberships, requireIn } from '@/lib/player'
import { avatarUrl } from '@/lib/image'
import { Admin, Stemma } from '@/components/lega-menu'
import { Card, Loading, PageTitle } from '@/components/ui'
import { ImportaCalendario } from '@/components/importa-calendario'
import { getT } from '@/lib/lingua'

// Importa un calendario esterno (.ics o link) e sceglie quali eventi diventano partite o allenamenti.
export default function ImportaPage({ searchParams }: PageProps<'/calendario/importa'>) {
  return (
    <Suspense fallback={<Loading />}>
      <Importa searchParams={searchParams} />
    </Suspense>
  )
}

async function Importa({ searchParams }: { searchParams: PageProps<'/calendario/importa'>['searchParams'] }) {
  const [{ lega }, mie, attiva, t] = await Promise.all([searchParams, getMemberships(), getCurrentPlayer(), getT()])
  const titolo = <PageTitle>📥 {t('Importa un calendario')}</PageTitle>
  // la lega: quella indicata, quella attiva se la organizzo (anche da ospite), o si sceglie tra quelle che organizzo
  const legaId = typeof lega === 'string' ? lega : attiva?.isAdmin ? attiva.lega._id : undefined
  const organizzate = mie.filter((m) => m.isAdmin)
  if (!legaId) {
    return (
      <>
        {titolo}
        <Card className="space-y-1">
          <p className="px-3 pb-1 font-semibold">{t('In quale lega?')}</p>
          {organizzate.length === 0 && <p className="px-3 text-sm text-zinc-500">{t('Solo chi organizza una lega può importare un calendario.')}</p>}
          {organizzate.map((m) => (
            <Link
              key={m.lega._id}
              href={`/calendario/importa?lega=${m.lega._id}`}
              className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <Stemma lega={{ nome: m.lega.nome, logo: avatarUrl(m.lega.logo, 64) }} size={28} />
              <span className="min-w-0 flex-1 truncate font-medium">{m.lega.nome}</span>
              <Admin />
              <span className="text-zinc-400">›</span>
            </Link>
          ))}
        </Card>
      </>
    )
  }
  const admin = await requireIn(legaId, 'organizzatore')
  return (
    <>
      {titolo}
      <p className="mb-3 text-sm text-zinc-500">
        {t('Nella lega')} <b>{admin.lega.nome}</b>
        {organizzate.length > 1 && (
          <>
            {' · '}
            <Link href="/calendario/importa?lega=" className="font-medium text-green-700 hover:underline dark:text-green-400">
              {t('Cambia')}
            </Link>
          </>
        )}
      </p>
      <ImportaCalendario legaId={admin.lega._id} />
    </>
  )
}
