import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { salvaConvocati } from '@/app/actions'
import { displayName, requireIn } from '@/lib/player'
import { conSelezione, getMatch, getPlayers } from '@/lib/matches'
import { MOTIVI_INDISPONIBILE, indisponibileIl } from '@/lib/roster'
import { isoToRomeLocal } from '@/lib/dates'
import { getT } from '@/lib/lingua'
import { Loading, PageTitle } from '@/components/ui'
import { ScegliConvocati, type Candidato } from '@/components/scegli-convocati'

// Leghe "Squadra": l'allenatore sceglie chi convocare per la partita.
export default async function ConvocatiPage({ params }: PageProps<'/partite/[id]/convocati'>) {
  const t = await getT()
  return (
    <>
      <PageTitle>📋 {t('Scegli i convocati')}</PageTitle>
      <Suspense fallback={<Loading />}>
        <Elenco params={params} />
      </Suspense>
    </>
  )
}

async function Elenco({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const match = await getMatch(id)
  if (!match || !conSelezione(match)) notFound()
  const [admin, t] = await Promise.all([requireIn(match.legaId, 'organizzatore'), getT()])
  const rosa = (await getPlayers(admin.lega._id)).filter((p) => p.attivo !== false)
  const giorno = isoToRomeLocal(match.data).slice(0, 10)
  const risposte = new Map(match.convocazioni.map((c) => [c.giocatore._id, c.risposta]))
  const candidati: Candidato[] = rosa
    .map((p) => {
      const fuori = indisponibileIl(p, giorno) ? MOTIVI_INDISPONIBILE[p.indisponibile!.motivo] : null
      return {
        id: p._id,
        nome: displayName(p),
        ruolo: p.ruolo,
        indisponibile: fuori ? `${fuori.emoji} ${t(fuori.label)}${p.indisponibile?.nota ? ` · ${p.indisponibile.nota}` : ''}` : undefined,
        risposta: risposte.get(p._id),
      }
    })
    // prima i disponibili, poi gli indisponibili; in ordine di nome
    .sort((a, b) => Number(!!a.indisponibile) - Number(!!b.indisponibile) || a.nome.localeCompare(b.nome))

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-500">
        {t.giorno(match.data)} · {match.luogo}.{' '}
        {t('Solo i convocati ricevono l’avviso e possono confermare. Chi togli esce dalla lista.')}
      </p>
      <ScegliConvocati azione={salvaConvocati.bind(null, match._id)} candidati={candidati} scelti={match.convocati ?? []} />
      <Link href={`/partite/${match._id}`} className="text-sm text-green-700 hover:underline dark:text-green-400">
        ← {t('Torna alla partita')}
      </Link>
    </div>
  )
}
