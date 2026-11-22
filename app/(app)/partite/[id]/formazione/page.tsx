import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { salvaFormazioneTitolare } from '@/app/actions'
import { displayName, isAllenatore, requireIn } from '@/lib/player'
import { getMatch, presenti } from '@/lib/matches'
import { isFormato, moduloPer, posti, proponi } from '@/lib/moduli'
import { forza } from '@/lib/teams'
import { avatarUrl } from '@/lib/image'
import { getT } from '@/lib/lingua'
import { formaDellaLega, ioPro } from '@/lib/pro'
import { Card, Loading, PageTitle } from '@/components/ui'
import { EditorFormazione, type Candidato } from '@/components/editor-formazione'

// Club: la formazione titolare della partita, con il modulo, tra chi è in lista.
export default async function FormazionePage({ params }: PageProps<'/partite/[id]/formazione'>) {
  const t = await getT()
  return (
    <>
      <PageTitle>🧢 {t('Formazione')}</PageTitle>
      <Suspense fallback={<Loading />}>
        <Editor params={params} />
      </Suspense>
    </>
  )
}

async function Editor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const match = await getMatch(id)
  if (!match || !match.club || match.tipo === 'allenamento' || match.torneo) notFound()
  const [admin, t] = await Promise.all([requireIn(match.legaId, 'organizzatore'), getT()])
  const indietro = (
    <Link href={`/partite/${match._id}`} className="text-sm text-green-700 hover:underline dark:text-green-400">
      ← {t('Torna alla partita')}
    </Link>
  )
  const inLista = presenti(match).map((c) => c.giocatore).filter((p) => !isAllenatore(p))
  if (inLista.length === 0) {
    return (
      <Card className="space-y-2">
        <p>{t('Prima servono i giocatori in lista.')}</p>
        {indietro}
      </Card>
    )
  }

  // la forma (Pro) pesa anche nella proposta, come per le squadre
  const forma = (await ioPro(admin.lega._id)) ? (await formaDellaLega(admin.lega._id)).forma : null
  const candidati: Candidato[] = inLista.map((p) => ({
    id: p._id,
    nome: p.cognome ? `${p.nome} ${p.cognome[0]}.` : displayName(p),
    numero: p.numero,
    foto: avatarUrl(p.foto, 96),
    ruolo: p.ruolo,
    forza: forza({ ...p, forma: forma?.get(p._id) }),
  }))
  const formato = isFormato(match.formato) ? match.formato : 11
  // la formazione salvata, se il modulo va ancora bene; altrimenti quella proposta col modulo preferito
  const salvata = match.formazione && moduloPer(formato, match.formazione.modulo) === match.formazione.modulo ? match.formazione : null
  const modulo = salvata?.modulo ?? moduloPer(formato, match.moduloLega)
  const validi = new Set(candidati.map((c) => c.id))
  const iniziali = salvata
    ? posti(modulo).map((p) => {
        const g = salvata.posti.find((x) => x.posto === p.indice)?.id
        return g && validi.has(g) ? g : null
      })
    : proponi(modulo, candidati)

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-500">
        {t('Calcio a {n}', { n: formato })} · {t.giorno(match.data)}. {t('Tocca un posto sul campo e poi il giocatore da mettere.')}
      </p>
      <EditorFormazione azione={salvaFormazioneTitolare.bind(null, match._id)} formato={formato} moduloIniziale={modulo} postiIniziali={iniziali} candidati={candidati} />
      {indietro}
    </div>
  )
}
