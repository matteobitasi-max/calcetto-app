import Link from 'next/link'
import { Suspense } from 'react'
import { attivaSerie } from '@/app/actions'
import { requireAdmin } from '@/lib/player'
import { descriviSerie, getAllSeries } from '@/lib/series'
import { sanity } from '@/lib/sanity'
import { formatData } from '@/lib/dates'
import { SubmitButton } from '@/components/submit-button'
import { ButtonLink, Card, Loading, PageTitle, buttonClass } from '@/components/ui'

export default function RicorrentiPage() {
  return (
    <>
      <PageTitle action={<ButtonLink href="/partite/nuova">+ Nuova</ButtonLink>}>Partite ricorrenti</PageTitle>
      <Suspense fallback={<Loading />}>
        <Elenco />
      </Suspense>
    </>
  )
}

async function Elenco() {
  await requireAdmin()
  const series = await getAllSeries()
  const prossime = await sanity.fetch<{ _id: string; data: string; serie: string }[]>(
    `*[_type == "match" && defined(serie) && data > now() && stato != "annullata"] | order(data asc){_id, data, "serie": serie._ref}`,
  )

  if (series.length === 0) {
    return (
      <Card className="text-sm text-zinc-500">
        Nessuna partita ricorrente. Crea una partita e spunta &quot;Ripeti questa partita&quot;.
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {series.map((s) => {
        const { quando, finestra } = descriviSerie(s)
        const date = prossime.filter((p) => p.serie === s._id).slice(0, 3)
        const attiva = s.attiva !== false
        return (
          <Card key={s._id} className={`space-y-2 ${attiva ? '' : 'opacity-60'}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold capitalize">{quando}</h2>
                <p className="text-sm text-zinc-500">
                  📍 {s.luogo} · {s.postiDisponibili} giocatori{s.quota != null && ` · ${s.quota} €`}
                </p>
              </div>
              {!attiva && <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">Interrotta</span>}
            </div>
            <p className="text-sm">{finestra}</p>
            {s.fineData && <p className="text-sm text-zinc-500">Fino al {formatData(`${s.fineData}T12:00:00Z`, { dateStyle: 'long' })}</p>}
            {date.length > 0 && (
              <p className="text-sm">
                Prossime:{' '}
                {date.map((p, i) => (
                  <span key={p._id}>
                    {i > 0 && ', '}
                    <Link href={`/partite/${p._id}`} className="text-green-700 hover:underline dark:text-green-400">
                      {formatData(p.data, { weekday: 'short', day: 'numeric', month: 'short' })}
                    </Link>
                  </span>
                ))}
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              <ButtonLink href={`/partite/ricorrenti/${s._id}`} variant="secondary">
                Modifica
              </ButtonLink>
              <form action={attivaSerie.bind(null, s._id, !attiva)}>
                <SubmitButton
                  className={buttonClass(attiva ? 'danger' : 'primary')}
                  confirm={attiva ? 'Interrompere la serie? Le prossime partite senza risposte verranno tolte.' : undefined}
                >
                  {attiva ? 'Interrompi' : 'Riattiva'}
                </SubmitButton>
              </form>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
