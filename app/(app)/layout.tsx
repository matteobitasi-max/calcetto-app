import { TemaClub } from '@/components/tema-club'
import Link from 'next/link'
import { Suspense } from 'react'
import { UserButton } from '@clerk/nextjs'
import { getCurrentPlayer, getMemberships, isTitolare } from '@/lib/player'
import { avatarUrl, immagineUrl } from '@/lib/image'
import { Avatar } from '@/components/ui'
import { LegaZoom } from '@/components/logo-zoom'
import { LegaMenu } from '@/components/lega-menu'
import { MenuSezioni } from '@/components/menu-sezioni'
import { MenuLaterale } from '@/components/menu-laterale'
import { SEZIONI, barraClass, pillClass } from '@/components/sezioni'
import { NotificheNativeListener } from '@/components/notifiche-native'
import { caricaLogoLega } from '@/app/actions'
import { ScuotiFoto } from '@/components/scuoti-foto'
import { UsaApp } from '@/components/usa-app'
import { RiprendiInvito } from '@/components/invito-app'
import { KmAutomatici } from '@/components/km-automatici'
import { getT } from '@/lib/lingua'
import { wrapDaProporre } from '@/lib/wrap'
import { getMioCentro } from '@/lib/centro'
import { WrapInvito } from '@/components/wrap-invito'


export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const t = await getT()
  return (
    <div className="campo flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 pt-[var(--safe-area-inset-top,env(safe-area-inset-top))] backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90">
        {/* sul computer l'intestazione si allarga; le pillole lasciano il posto al menu a sinistra */}
        <div className="mx-auto max-w-2xl px-4 lg:max-w-6xl lg:px-6">
          <div className="flex items-center gap-3 py-2">
            <Suspense fallback={<span className="h-10 flex-1" />}>
              <LegaEUtente />
            </Suspense>
          </div>
          <nav className={`${barraClass} mb-2.5 lg:hidden`}>
            {/* La pillola evidenziata dipende dalla pagina: fuori dal Suspense resta il menu senza evidenziazione */}
            <Suspense
              fallback={SEZIONI.map((s) => (
                <Link key={s.href} href={s.href} className={pillClass(false)}>
                  {t(s.label)}
                </Link>
              ))}
            >
              <MenuSezioni />
            </Suspense>
          </nav>
        </div>
      </header>
      <NotificheNativeListener />
      <UsaApp />
      <RiprendiInvito />
      <KmAutomatici />
      <Suspense>
        <WrapDaProporre />
      </Suspense>
      {/* computer: menu fisso a sinistra e contenuto più largo; telefono: com'era */}
      <div className="mx-auto flex w-full max-w-6xl flex-1 lg:gap-6 lg:px-6">
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-24 py-4">
            <Suspense>
              <MenuLateraleLega />
            </Suspense>
          </div>
        </aside>
        <main className="linee-campo mx-auto w-full max-w-2xl flex-1 p-4 pb-[max(1rem,var(--safe-area-inset-bottom,env(safe-area-inset-bottom)))] lg:max-w-3xl">
          {children}
        </main>
      </div>
    </div>
  )
}

// Fine stagione: il pop-up per aprire il wrap della stagione appena terminata (una volta per giocatore).
async function WrapDaProporre() {
  const w = await wrapDaProporre().catch(() => null)
  return w ? <WrapInvito chiave={w.chiave} stagione={w.stagione} lega={w.lega} legaId={w.legaId} /> : null
}

// Il menu a sinistra del computer: gli strumenti di chi organizza solo agli organizzatori.
async function MenuLateraleLega() {
  const me = await getCurrentPlayer()
  return <MenuLaterale organizzatore={!!me?.isAdmin} club={!!me?.lega.club && me.lega.tipo === 'squadra'} />
}

// La lega attiva (con il menu per cambiarla) e la mia foto, che apre il mio profilo.
async function LegaEUtente() {
  const [me, leghe, titolare, t, centro] = await Promise.all([getCurrentPlayer(), getMemberships(), isTitolare(), getT(), getMioCentro().catch(() => null)])
  // Chi non è (ancora) in nessuna lega ha comunque bisogno del menu Clerk per uscire.
  if (!me) {
    return (
      <>
        <TemaClub attivo={false} />
        <span className="flex-1 font-semibold">{t('Calcetto')}</span>
        <UserButton />
      </>
    )
  }
  const voce = (m: (typeof leghe)[number]) => ({
    id: m.lega._id,
    nome: m.lega.nome,
    logo: avatarUrl(m.lega.logo, 64),
    organizzatore: !!m.isAdmin && !m.ospite,
    club: !!m.lega.club && m.lega.tipo === 'squadra',
  })
  return (
    <>
      {/* leghe Club PRO: l'app diventa blu */}
      <TemaClub attivo={!!me.lega.club && me.lega.tipo === 'squadra'} />
      <LegaZoom
        nome={me.lega.nome}
        piccola={avatarUrl(me.lega.logo, 96)}
        grande={immagineUrl(me.lega.logo, 1024)}
        cambia={me.isAdmin ? caricaLogoLega.bind(null, me.lega._id) : undefined}
      />
      {me.lega.fotoSorprese.length > 0 && <ScuotiFoto urls={me.lega.fotoSorprese.map((f) => immagineUrl(f, 1200)!)} />}
      <div className="min-w-0 flex-1">
        <LegaMenu
          corrente={voce(me)}
          altre={leghe.filter((m) => m.lega._id !== me.lega._id).map(voce)}
          organizzatore={!!me.isAdmin}
          titolare={titolare}
          ospite={!!me.ospite}
          centro={centro?.nome}
        />
      </div>
      <Link
        href="/profilo"
        title={t('Il mio profilo')}
        className="shrink-0 rounded-full ring-2 ring-green-600 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900"
      >
        <Avatar player={me} size={34} zoom={false} />
      </Link>
    </>
  )
}
