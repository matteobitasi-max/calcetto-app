import Link from 'next/link'
import { VaiA } from '@/components/vai-a'
import { Suspense } from 'react'
import { entraNelTorneo } from '@/app/actions'
import { membroDi, getUtente } from '@/lib/player'
import { sanity } from '@/lib/sanity'
import { avatarUrl } from '@/lib/image'
import type { SanityImage } from '@/lib/roster'
import { iscrizioniAperte } from '@/lib/tornei'
import { SubmitButton } from '@/components/submit-button'
import { Card, Loading, buttonClass } from '@/components/ui'
import { getT } from '@/lib/lingua'

// Invito dell'organizzatore al torneo: si entra nella lega (se serve) e si sceglie la squadra.
export default function InvitoTorneoPage({ params }: PageProps<'/invito-torneo/[codice]'>) {
  return (
    <Suspense fallback={<Loading />}>
      <Invito params={params} />
    </Suspense>
  )
}

type Squadra = { _key: string; nome: string; colore?: string; logo?: SanityImage; giocatori: string[] }

async function Invito({ params }: { params: Promise<{ codice: string }> }) {
  const t = await getT()
  const { codice } = await params
  if ((await getUtente())?.daCompletare) return <VaiA href={`/completa-profilo?dopo=/invito-torneo/${encodeURIComponent(codice)}`} />
  const c = codice.toUpperCase()
  const torneo = await sanity.fetch<{
    _id: string
    nome: string
    legaId: string
    legaNome: string
    maxGiocatori?: number
    iscrizioniChiuse?: boolean
    primaPartita?: string
    squadre: Squadra[]
  } | null>(
    `*[_type == "tournament" && codiceInvito == $c][0]{_id, nome, "legaId": lega._ref, "legaNome": lega->nome, maxGiocatori, iscrizioniChiuse,
      "primaPartita": *[_type == "match" && torneo._ref == ^._id] | order(data asc)[0].data,
      "squadre": coalesce(squadre[]{_key, nome, colore, logo, "giocatori": coalesce(giocatori[]._ref, [])}, [])}`,
    { c },
  )

  if (!torneo) {
    return (
      <Card className="space-y-3 text-center">
        <h1 className="text-lg font-semibold">{t('Invito non valido')}</h1>
        <p className="text-sm text-zinc-500">{t('Il link è sbagliato o è stato cambiato. Chiedine uno nuovo all’organizzatore.')}</p>
        <Link href="/benvenuto" className="text-sm text-green-700 hover:underline dark:text-green-400">
          {t('Vai alla pagina iniziale')}
        </Link>
      </Card>
    )
  }

  const me = await membroDi(torneo.legaId)
  const mia = me ? torneo.squadre.find((s) => s.giocatori.includes(me._id)) : undefined
  const aperte = iscrizioniAperte(torneo)

  return (
    <div className="space-y-4">
      <Card className="space-y-1 text-center">
        <p className="text-4xl">🏆</p>
        <p className="text-sm text-zinc-500">{t('Sei stato invitato al torneo')}</p>
        <h1 className="text-2xl font-bold">{torneo.nome}</h1>
        <p className="text-sm text-zinc-500">🏟️ {torneo.legaNome}</p>
      </Card>

      {mia && (
        <Link href={`/tornei/${torneo._id}`} className={`${buttonClass('primary')} w-full justify-center`}>
          {t('Sei già nei {squadra}: apri il torneo', { squadra: mia.nome })}
        </Link>
      )}
      {!aperte && <p className="rounded-lg bg-amber-50 p-3 text-center text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">{t('Le iscrizioni a questo torneo sono chiuse.')}</p>}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{aperte && !mia ? t('Scegli la tua squadra') : t('Squadre')}</h2>
        <Card className="divide-y divide-zinc-100 p-0! dark:divide-zinc-800">
          {torneo.squadre.map((s) => {
            const logo = avatarUrl(s.logo, 96)
            const piena = !!torneo.maxGiocatori && s.giocatori.length >= torneo.maxGiocatori
            return (
              <div key={s._key} className="flex items-center gap-3 px-4 py-3">
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- immagine già ridimensionata dal CDN di Sanity
                  <img src={logo} alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="h-9 w-9 shrink-0 rounded-full" style={{ background: s.colore }} />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{s.nome}</span>
                  <span className="block text-xs text-zinc-500">
                    {t.n(s.giocatori.length, '{n}{max} giocatore', '{n}{max} giocatori', { max: torneo.maxGiocatori ? `/${torneo.maxGiocatori}` : '' })}
                  </span>
                </span>
                {s === mia ? (
                  <span className="text-xs font-semibold text-green-700 dark:text-green-400">{t('la tua squadra')}</span>
                ) : piena ? (
                  <span className="text-xs text-zinc-500">{t('Al completo')}</span>
                ) : (
                  aperte && (
                    <form action={entraNelTorneo.bind(null, c, s._key)}>
                      <SubmitButton className={buttonClass(mia ? 'secondary' : 'primary')} pendingText={t('Entro…')}>
                        {mia ? t('Passa qui') : t('Entra')}
                      </SubmitButton>
                    </form>
                  )
                )}
              </div>
            )
          })}
        </Card>
      </section>
    </div>
  )
}
