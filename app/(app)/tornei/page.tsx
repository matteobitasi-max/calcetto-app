import Link from 'next/link'
import { Suspense } from 'react'
import { getMemberships, requirePlayer } from '@/lib/player'
import { getTorneiDelleLeghe, puoCreareTornei } from '@/lib/tornei'
import { avatarUrl } from '@/lib/image'
import { Stemma } from '@/components/lega-menu'
import { PallinoAdmin } from '@/components/pallino-admin'
import { Card, Loading, PageTitle } from '@/components/ui'
import { buttonClass } from '@/components/ui-classes'
import { getT } from '@/lib/lingua'

// I miei tornei: quelli di tutte le mie leghe, non solo della lega attiva. Prima quelli in corso.
export default function TorneiPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Elenco />
    </Suspense>
  )
}

async function Elenco() {
  const [, mie, t] = await Promise.all([requirePlayer(), getMemberships(), getT()])
  const mioIn = new Map(mie.map((m) => [m.lega._id, m._id]))
  const [tornei, pro] = await Promise.all([
    getTorneiDelleLeghe(mie.map((m) => m.lega._id)),
    // si creano tornei nelle leghe che organizzo, con il mio Pro
    Promise.all(mie.filter((m) => m.isAdmin).map((m) => puoCreareTornei(m.lega._id))).then((l) => l.some(Boolean)),
  ])
  const concluso = (x: (typeof tornei)[number]) => x.partite > 0 && x.giocate === x.partite
  const ordinati = [...tornei.filter((x) => !concluso(x)), ...tornei.filter(concluso)]

  return (
    <>
      <PageTitle
        action={
          pro && (
            <Link href="/tornei/nuovo?scegli=1" className="rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">
              ＋ {t('Nuovo torneo')}
            </Link>
          )
        }
      >
        🏆 {t('I miei tornei')}
      </PageTitle>
      {!pro && (
        <Card className="mb-4 space-y-3 border-amber-300! bg-gradient-to-br from-amber-50 to-white text-center dark:border-amber-700/60! dark:from-amber-950/50 dark:to-zinc-900">
          <span className="inline-block rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-zinc-900">PRO</span>
          <p className="font-semibold">{t('Passa a Pro per creare il tuo torneo con tutte le funzioni dell’abbonamento Pro.')}</p>
          <ul className="space-y-1 text-left text-sm text-zinc-600 dark:text-zinc-300">
            <li>🔁 {t('Girone all’italiana, tabellone a eliminazione diretta o gironi + tabellone')}</li>
            <li>👕 {t('Squadre con nome, foto e capitano, che invita i compagni con un link')}</li>
            <li>📊 {t('Classifiche, tabellone e marcatori sempre aggiornati')}</li>
          </ul>
          <Link href="/pro" className={`${buttonClass('primary')} w-full justify-center`}>
            {t('Passa a Pro')}
          </Link>
        </Card>
      )}
      {ordinati.length === 0 ? (
        <Card className="text-center text-sm text-zinc-500">{t('Nessun torneo nelle tue leghe.')}</Card>
      ) : (
        <Card className="divide-y divide-zinc-100 p-0 dark:divide-zinc-800">
          {ordinati.map((x) => {
            const io = mioIn.get(x.legaId)
            const mia = x.squadre.find((s) => s.giocatori.some((g) => g._id === io))
            return (
              <Link key={x._id} href={`/tornei/${x._id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                <Stemma lega={{ nome: x.lega.nome, logo: avatarUrl(x.lega.logo, 64) }} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{x.nome}</span>
                  <span className="block truncate text-xs text-zinc-500">
                    🏟️ {x.lega.nome} · {t('{n} squadre', { n: x.squadre.length })} · {t('{n}/{tot} giocate', { n: x.giocate, tot: x.partite })}
                  </span>
                  {mia && (
                    <span className="mt-0.5 flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
                      {t('Giochi nei {squadra}', { squadra: mia.nome })}
                      {mia.capitanoId === io && <PallinoAdmin title={t('Capitano della squadra')} />}
                    </span>
                  )}
                </span>
                <span className={`shrink-0 text-xs font-semibold ${concluso(x) ? 'text-zinc-500' : 'text-green-700 dark:text-green-500'}`}>
                  {concluso(x) ? t('Concluso') : t('In corso')}
                </span>
              </Link>
            )
          })}
        </Card>
      )}
    </>
  )
}
