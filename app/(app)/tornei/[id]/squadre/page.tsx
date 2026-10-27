import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { salvaSquadreTorneo } from '@/app/actions'
import { displayName, requireIn } from '@/lib/player'
import { getPlayers } from '@/lib/matches'
import { forza } from '@/lib/teams'
import { avatarUrl } from '@/lib/image'
import { getTorneo, puoCreareTornei } from '@/lib/tornei'
import { ActionForm } from '@/components/action-form'
import { PillSalva } from '@/components/pill-salva'
import { Card, Field, Loading, PageTitle, inputClass } from '@/components/ui'
import { SquadreEditor } from '../../squadre-editor'
import { getT } from '@/lib/lingua'

// L'organizzatore rinomina le squadre e sposta i giocatori: vale per le partite non ancora giocate.
export default async function SquadreTorneoPage({ params }: PageProps<'/tornei/[id]/squadre'>) {
  const t = await getT()
  return (
    <>
      <PageTitle>{t('Squadre del torneo')}</PageTitle>
      <Suspense fallback={<Loading />}>
        <Editor params={params} />
      </Suspense>
    </>
  )
}

async function Editor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const torneo = await getTorneo(id)
  if (!torneo) notFound()
  const [, t] = await Promise.all([requireIn(torneo.legaId, 'organizzatore'), getT()])
  if (!(await puoCreareTornei(torneo.legaId))) notFound()

  const nelTorneo = new Set(torneo.squadre.flatMap((s) => s.giocatori.map((g) => g._id)))
  const rosa = (await getPlayers(torneo.legaId))
    .filter((p) => p.attivo !== false || nelTorneo.has(p._id))
    .map((p) => ({ id: p._id, nome: displayName(p), forza: forza(p), ruolo: p.ruolo }))
  const squadraIniziale = Object.fromEntries(torneo.squadre.flatMap((s, i) => s.giocatori.map((g) => [g._id, String(i)])))

  return (
    <div className="space-y-3">
      <Link href={`/tornei/${torneo._id}`} className="text-sm text-green-700 hover:underline dark:text-green-400">
        ← {torneo.nome}
      </Link>
      <p className="text-sm text-zinc-500">
        {t('Le modifiche valgono per le partite ancora da giocare; quelle già giocate restano come sono.')}
        {torneo.giocate > 0 && ` (${t.n(torneo.giocate, '{n} già giocata', '{n} già giocate')})`}
      </p>
      <ActionForm action={salvaSquadreTorneo.bind(null, torneo._id)} className="pb-20">
        <Card className="space-y-4">
          <Field label={t('Giocatori massimi per squadra (facoltativo)')}>
            <input name="maxGiocatori" type="number" min={1} max={50} defaultValue={torneo.maxGiocatori} placeholder={t('Nessun limite')} className={inputClass} />
          </Field>
          <SquadreEditor
            rosa={rosa}
            numSquadre={torneo.squadre.length}
            nomiIniziali={torneo.squadre.map((s) => s.nome)}
            coloriIniziali={torneo.squadre.map((s) => s.colore ?? '')}
            fotoIniziali={torneo.squadre.map((s) => avatarUrl(s.logo, 96))}
            capitaniIniziali={torneo.squadre.map((s) => s.capitanoId)}
            squadraIniziale={squadraIniziale}
          />
        </Card>
        <PillSalva label={t('Salva squadre')} />
      </ActionForm>
    </div>
  )
}
