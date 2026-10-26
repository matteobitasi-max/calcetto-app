import Link from 'next/link'
import { Suspense } from 'react'
import { scegliLega, uniscitiConInvito } from '@/app/actions'
import { membroDi } from '@/lib/player'
import { sanity } from '@/lib/sanity'
import { avatarUrl } from '@/lib/image'
import type { SanityImage } from '@/lib/roster'
import { SubmitButton } from '@/components/submit-button'
import { Card, Loading, buttonClass } from '@/components/ui'
import { getT } from '@/lib/lingua'

export default function InvitoPage({ params }: PageProps<'/invito/[codice]'>) {
  return (
    <Suspense fallback={<Loading />}>
      <Invito params={params} />
    </Suspense>
  )
}

async function Invito({ params }: { params: Promise<{ codice: string }> }) {
  const t = await getT()
  const { codice } = await params
  const lega = await sanity.fetch<{ _id: string; nome: string; logo?: SanityImage; giocatori: number } | null>(
    `*[_type == "league" && codiceInvito == $codice][0]{_id, nome, logo, "giocatori": count(*[_type == "player" && lega._ref == ^._id && attivo != false])}`,
    { codice: codice.toUpperCase() },
  )

  if (!lega) {
    return (
      <Card className="space-y-3 text-center">
        <h1 className="text-lg font-semibold">{t('Invito non valido')}</h1>
        <p className="text-sm text-zinc-500">{t('Il link è sbagliato oppure l’organizzatore l’ha cambiato. Chiedigliene uno nuovo.')}</p>
        <Link href="/benvenuto" className="text-sm text-green-700 hover:underline dark:text-green-400">
          {t('Vai alla pagina iniziale')}
        </Link>
      </Card>
    )
  }

  const giaDentro = !!(await membroDi(lega._id))
  const logo = avatarUrl(lega.logo, 160)

  return (
    <Card className="space-y-4 text-center">
      {logo && (
        // eslint-disable-next-line @next/next/no-img-element -- immagine già ridimensionata dal CDN di Sanity
        <img src={logo} alt="" width={80} height={80} className="mx-auto h-20 w-20 rounded-2xl object-cover" />
      )}
      <div>
        <p className="text-sm text-zinc-500">{t('Sei stato invitato in')}</p>
        <h1 className="text-2xl font-bold">{lega.nome}</h1>
        <p className="text-sm text-zinc-500">
          {t.n(lega.giocatori, '{n} giocatore nella rosa', '{n} giocatori nella rosa')}
        </p>
      </div>
      {giaDentro ? (
        <form action={scegliLega.bind(null, lega._id, '/')}>
          <SubmitButton className={`${buttonClass('primary')} w-full`}>{t('Fai già parte della lega: apri')}</SubmitButton>
        </form>
      ) : (
        <form action={uniscitiConInvito.bind(null, codice)}>
          <SubmitButton className={`${buttonClass('primary')} w-full`} pendingText={t('Entro…')}>
            ⚽ {t('Entra nella lega')}
          </SubmitButton>
        </form>
      )}
    </Card>
  )
}
