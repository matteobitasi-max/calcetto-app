import Link from 'next/link'
import { Suspense } from 'react'
import { getCurrentPlayer, getMemberships } from '@/lib/player'
import { EtichettaClub, PillScelta } from '@/components/pill-scelta'
import { getTornei, puoCreareTornei } from '@/lib/tornei'
import { sanity } from '@/lib/sanity'
import { percorsoModello } from '@/lib/modello'
import { Card, Loading, PageTitle } from '@/components/ui'
import { getT } from '@/lib/lingua'
import { ImportaGiocatori, type LegaImport } from './importa-giocatori'

// Importazione dei giocatori da Excel o CSV (pensata per il computer): lega, torneo e squadra da menu a tendina.
// In alto la scelta: giocatori ed email (Excel o CSV) oppure dati dalle telecamere Veo (Club Allenatore).
export default async function ImportaPage({ searchParams }: PageProps<'/giocatori/importa'>) {
  const t = await getT()
  return (
    <>
      <PageTitle>📥 {t('Importa')}</PageTitle>
      <Suspense fallback={<Loading />}>
        <Importa searchParams={searchParams} />
      </Suspense>
    </>
  )
}

async function Importa({ searchParams }: { searchParams: PageProps<'/giocatori/importa'>['searchParams'] }) {
  const [{ tipo }, mie, attiva, t] = await Promise.all([searchParams, getMemberships(), getCurrentPlayer(), getT()])
  const veo = tipo === 'veo'
  const scelta = (
    <PillScelta
      voci={[
        { href: '/giocatori/importa', label: `👥 ${t('Giocatori ed email')}`, attiva: !veo },
        { href: '/giocatori/importa?tipo=veo', label: `🎥 ${t('Dati da Veo')}`, attiva: veo },
      ]}
    />
  )
  if (veo) {
    const club = !!attiva?.lega.club && attiva.lega.tipo === 'squadra'
    return (
      <div className="space-y-4">
        {scelta}
        <Card className="space-y-3">
          <h2 className="flex items-center gap-2 font-semibold">
            🎥 {t('Dati da Veo')} <EtichettaClub />
          </h2>
          <p className="text-sm text-zinc-500">{t('Carichi l’Excel scaricato da Veo dopo la partita: statistiche di squadra e dei giocatori (km, sprint, velocità, passaggi, tiri) entrano nella partita e nei profili, e aggiornano le caratteristiche con le proposte di voto.')}</p>
          {club ? (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">⏳ {t('In arrivo: stiamo preparando la lettura dei file di Veo.')}</p>
          ) : (
            <div className="space-y-2 rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-950">
              <p>🔒 {t('Disponibile con il Club Allenatore.')}</p>
              <Link href={`/club${attiva?.isAdmin ? `?lega=${attiva.lega._id}` : ''}`} className="font-semibold text-green-700 hover:underline dark:text-green-400">
                {t('Scopri il Club Allenatore ›')}
              </Link>
            </div>
          )}
        </Card>
      </div>
    )
  }
  const organizzate = mie.filter((m) => m.isAdmin && !m.ospite)
  if (!organizzate.length) {
    return (
      <div className="space-y-4">
        {scelta}
        <Card className="text-sm text-zinc-500">{t('Solo gli organizzatori possono importare giocatori.')}</Card>
      </div>
    )
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
        club: !!lega.club,
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
      {scelta}
      <Link href="/giocatori" className="text-sm text-green-700 hover:underline dark:text-green-400">
        ← {t('Rosa')}
      </Link>
      <ImportaGiocatori leghe={leghe} />
    </div>
  )
}
