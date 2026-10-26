import Link from 'next/link'
import { Suspense } from 'react'
import { entraInSquadra } from '@/app/actions'
import { membroDi } from '@/lib/player'
import { sanity } from '@/lib/sanity'
import { avatarUrl } from '@/lib/image'
import type { SanityImage } from '@/lib/roster'
import { iscrizioniAperte } from '@/lib/tornei'
import { SubmitButton } from '@/components/submit-button'
import { Card, Loading, buttonClass } from '@/components/ui'
import { getT } from '@/lib/lingua'

// Invito del capitano: si entra nella lega (se serve) e direttamente nella sua squadra del torneo.
export default function InvitoSquadraPage({ params }: PageProps<'/invito-squadra/[codice]'>) {
  return (
    <Suspense fallback={<Loading />}>
      <Invito params={params} />
    </Suspense>
  )
}

async function Invito({ params }: { params: Promise<{ codice: string }> }) {
  const t = await getT()
  const { codice } = await params
  const c = codice.toUpperCase()
  const torneo = await sanity.fetch<{
    _id: string
    nome: string
    legaId: string
    legaNome: string
    maxGiocatori?: number
    iscrizioniChiuse?: boolean
    primaPartita?: string
    squadra?: { _key: string; nome: string; colore?: string; logo?: SanityImage; giocatori: string[]; capitano?: string }
  } | null>(
    `*[_type == "tournament" && $c in squadre[].codiceInvito][0]{_id, nome, "legaId": lega._ref, "legaNome": lega->nome, maxGiocatori, iscrizioniChiuse,
      "primaPartita": *[_type == "match" && torneo._ref == ^._id] | order(data asc)[0].data,
      "squadra": squadre[codiceInvito == $c][0]{_key, nome, colore, logo, "giocatori": coalesce(giocatori[]._ref, []), "capitano": capitano->nome}}`,
    { c },
  )

  if (!torneo?.squadra) {
    return (
      <Card className="space-y-3 text-center">
        <h1 className="text-lg font-semibold">{t('Invito non valido')}</h1>
        <p className="text-sm text-zinc-500">{t('Il link è sbagliato. Chiedine uno nuovo al capitano.')}</p>
        <Link href="/benvenuto" className="text-sm text-green-700 hover:underline dark:text-green-400">
          {t('Vai alla pagina iniziale')}
        </Link>
      </Card>
    )
  }

  const { squadra } = torneo
  const me = await membroDi(torneo.legaId)
  const giaDentro = !!me && squadra.giocatori.includes(me._id)
  const aperte = iscrizioniAperte(torneo)
  const piena = !!torneo.maxGiocatori && squadra.giocatori.length >= torneo.maxGiocatori
  const logo = avatarUrl(squadra.logo, 160)

  return (
    <Card className="space-y-4 text-center">
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element -- immagine già ridimensionata dal CDN di Sanity
        <img src={logo} alt="" width={80} height={80} className="mx-auto h-20 w-20 rounded-full object-cover" />
      ) : (
        <span className="mx-auto block h-16 w-16 rounded-full" style={{ background: squadra.colore }} />
      )}
      <div>
        <p className="text-sm text-zinc-500">
          {squadra.capitano ? t('{nome} ti invita nella squadra', { nome: squadra.capitano }) : t('Sei stato invitato nella squadra')}
        </p>
        <h1 className="text-2xl font-bold">{squadra.nome}</h1>
        <p className="text-sm text-zinc-500">
          🏆 {torneo.nome} · 🏟️ {torneo.legaNome} ·{' '}
          {t.n(squadra.giocatori.length, '{n}{max} giocatore', '{n}{max} giocatori', { max: torneo.maxGiocatori ? `/${torneo.maxGiocatori}` : '' })}
        </p>
      </div>
      {giaDentro ? (
        <Link href={`/tornei/${torneo._id}`} className={`${buttonClass('primary')} w-full justify-center`}>
          {t('Sei già in squadra: apri il torneo')}
        </Link>
      ) : !aperte ? (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">{t('Le iscrizioni a questo torneo sono chiuse.')}</p>
      ) : piena ? (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">{t('La squadra è al completo.')}</p>
      ) : (
        <form action={entraInSquadra.bind(null, c)}>
          <SubmitButton className={`${buttonClass('primary')} w-full`} pendingText={t('Entro…')}>
            🏆 {t('Entra nella squadra')}
          </SubmitButton>
        </form>
      )}
    </Card>
  )
}
