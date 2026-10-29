import Link from 'next/link'
import { Suspense } from 'react'
import { getMemberships } from '@/lib/player'
import { getTornei, puoCreareTornei } from '@/lib/tornei'
import { sanity } from '@/lib/sanity'
import { percorsoModello } from '@/lib/modello'
import { Card, Loading, PageTitle } from '@/components/ui'
import { getT } from '@/lib/lingua'
import { ImportaGiocatori, type LegaImport } from './importa-giocatori'

// Importazione dei giocatori da Excel o CSV (pensata per il computer): lega, torneo e squadra da menu a tendina.
export default async function ImportaPage() {
  const t = await getT()
  return (
    <>
      <PageTitle>📥 {t('Importa giocatori')}</PageTitle>
      <Suspense fallback={<Loading />}>
        <Importa />
      </Suspense>
    </>
  )
}

async function Importa() {
  const [mie, t] = await Promise.all([getMemberships(), getT()])
  const organizzate = mie.filter((m) => m.isAdmin && !m.ospite)
  if (!organizzate.length) {
    return <Card className="text-sm text-zinc-500">{t('Solo gli organizzatori possono importare giocatori.')}</Card>
  }

  const leghe: LegaImport[] = await Promise.all(
    organizzate.map(async ({ lega }) => {
      const [rosa, tornei, pro] = await Promise.all([
        sanity.fetch<{ nome: string; cognome?: string; email?: string }[]>(`*[_type == "player" && lega._ref == $id && attivo != false]{nome, cognome, email}`, { id: lega._id }),
        getTornei(lega._id),
        puoCreareTornei(lega._id),
      ])
      return {
        id: lega._id,
        nome: lega.nome,
        modello: percorsoModello(lega._id),
        rosa,
        // tornei non ancora finiti, con le loro squadre (solo se la lega può usare i tornei)
        tornei: pro
          ? tornei
              .filter((tr) => !tr.partite || tr.giocate < tr.partite)
              .map((tr) => ({ id: tr._id, nome: tr.nome, squadre: tr.squadre.map((sq) => ({ key: sq._key, nome: sq.nome, giocatori: sq.giocatori.length })), max: tr.maxGiocatori }))
          : [],
      }
    }),
  )

  return (
    <div className="space-y-4">
      <Link href="/giocatori" className="text-sm text-green-700 hover:underline dark:text-green-400">
        ← {t('Rosa')}
      </Link>
      <ImportaGiocatori leghe={leghe} />
    </div>
  )
}
