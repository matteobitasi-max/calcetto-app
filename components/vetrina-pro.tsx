import Link from 'next/link'
import type { ReactNode } from 'react'
import { MarchioPro } from '@/components/logo-c'
import { BarraPro } from '@/components/barra-pro'
import { ButtonLink, Card } from '@/components/ui'
import type { T } from '@/lib/i18n'
import { MAX_LEGHE_PRO } from '@/lib/pro'

// Le parti della pagina The Cap Pro (app/(app)/pro/page.tsx).

// In cima: fondo verde campo con le strisce, il marchio PRO e la promessa.
export function Testata({ t, titolo, sotto, cta }: { t: T; titolo: string; sotto: string; cta?: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-600 via-green-700 to-emerald-900 px-5 pb-6 pt-5 text-white shadow-lg">
      {/* strisce del prato e cerchio di centrocampo */}
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.06)_0_28px,transparent_28px_56px)]" aria-hidden />
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full border-2 border-white/15" aria-hidden />
      <div className="relative space-y-3">
        <div className="flex items-center gap-2">
          <MarchioPro size={22} />
          <span className="text-sm font-semibold tracking-wide text-green-100">The Cap</span>
        </div>
        <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl">{titolo}</h1>
        <p className="text-sm leading-relaxed text-green-50">{sotto}</p>
        {cta && (
          <>
            <a href="#prezzi" className="inline-flex rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-zinc-900 shadow-md transition active:scale-95">
              {t('Passa a Pro')} →
            </a>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-green-100">
              <li>✓ {t('Paghi con Apple o Google')}</li>
              <li>✓ {t('Disdici quando vuoi')}</li>
              <li>✓ {t('Gratis per i giocatori')}</li>
            </ul>
          </>
        )}
      </div>
    </div>
  )
}

export function StatoLega({ t, attiva, admin, mioPro, lega, vendibile }: { t: T; attiva: boolean; admin: boolean; mioPro: boolean; lega: string; vendibile: boolean }) {
  if (attiva && admin && !mioPro) {
    // il Pro della lega è di un altro organizzatore: le funzioni da organizzatore sono di chi paga
    return (
      <p className="rounded-2xl bg-green-50 p-4 text-sm font-medium text-green-900 dark:bg-green-950 dark:text-green-200">
        {t('In {lega} il Pro è attivo grazie a un altro organizzatore: tutti vedono la forma e i tornei. Per creare tornei e approvare i voti serve il tuo abbonamento.', { lega })}
      </p>
    )
  }
  if (attiva) {
    return (
      <p className="rounded-2xl bg-green-50 p-4 text-sm font-medium text-green-900 dark:bg-green-950 dark:text-green-200">
        ✅ {t('La versione Pro è attiva in {lega}: tutto quello che vedi qui sotto è già disponibile.', { lega })}
      </p>
    )
  }
  if (!vendibile) {
    return (
      <p className="rounded-2xl bg-zinc-100 p-4 text-sm dark:bg-zinc-800">
        {t('In {lega} la versione Pro non è ancora attiva. Arriverà presto: se vuoi provarla con la tua lega,', { lega })}{' '}
        <Link href="/supporto" className="font-semibold text-green-700 hover:underline dark:text-green-400">
          {t('scrivici')}
        </Link>
        .
      </p>
    )
  }
  if (!admin) {
    return (
      <p className="rounded-2xl bg-zinc-100 p-4 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
        💡 {t('In {lega} la versione Pro non è attiva: la attiva un organizzatore della lega con il suo abbonamento.', { lega })}
      </p>
    )
  }
  return null
}

// I tre vantaggi principali, ognuno con un'anteprima disegnata di cosa si ottiene.
export function Vantaggi({ t, link }: { t: T; link?: boolean }) {
  const blocchi: { icona: string; titolo: string; testo: string; disegno: ReactNode; vai?: [string, string] }[] = [
    {
      icona: '🏆',
      titolo: t('Organizza tornei veri'),
      testo: t('Gironi, eliminazione diretta o tutti e due. Calendario, turni e classifiche si aggiornano da soli con i risultati. Ogni squadra ha nome, foto e capitano.'),
      disegno: <Tabellone />,
      vai: ['/tornei', t('I miei tornei')],
    },
    {
      icona: '📈',
      titolo: t('Scopri chi è in forma'),
      testo: t('Una freccia accanto al voto di ogni giocatore, aggiornata a ogni partita. Ogni 5 partite l’app ti propone i voti nuovi da gol, MVP, km e risultati: tu approvi o scarti.'),
      disegno: <Forma />,
      vai: ['/giocatori', t('Vai alla rosa')],
    },
    {
      icona: '🏃',
      titolo: t('Chi corre di più?'),
      testo: t('La classifica dei km a partita con il podio, il record di una partita e i km di tutta la lega. Nel profilo di ognuno, km totali e a partita.'),
      disegno: <PodioKm />,
      vai: ['/classifica', t('Vai alle statistiche')],
    },
    {
      icona: '⚖️',
      titolo: t('Squadre davvero equilibrate'),
      testo: t('Le formazioni automatiche tengono conto anche della forma, non solo dei voti: partite più combattute e meno discussioni.'),
      disegno: <Bilancia />,
    },
  ]
  return (
    <div className="space-y-3">
      {blocchi.map((b) => (
        <Card key={b.titolo} className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-2xl dark:bg-amber-950">{b.icona}</span>
            <div className="space-y-1">
              <h2 className="font-bold">{b.titolo}</h2>
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{b.testo}</p>
            </div>
          </div>
          {b.disegno}
          {link && b.vai && (
            <ButtonLink href={b.vai[0]} variant="secondary">
              {b.vai[1]} ›
            </ButtonLink>
          )}
        </Card>
      ))}
    </div>
  )
}

// Anteprime disegnate (solo grafica, non dati veri)
function Tabellone() {
  const squadra = (nome: string, gol: number, vince?: boolean) => (
    <div className={`flex items-center justify-between rounded-md px-2 py-1 text-[11px] ${vince ? 'bg-green-600 font-bold text-white' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800'}`}>
      <span>{nome}</span>
      <span className="tabular-nums">{gol}</span>
    </div>
  )
  return (
    <div className="grid grid-cols-[1fr_auto_1fr_auto_auto] items-center gap-2 rounded-2xl bg-zinc-50 p-3 dark:bg-zinc-900" aria-hidden>
      <div className="space-y-3">
        <div className="space-y-1">{squadra('Leoni', 3, true)}{squadra('Falchi', 1)}</div>
        <div className="space-y-1">{squadra('Squali', 2)}{squadra('Lupi', 4, true)}</div>
      </div>
      <span className="text-zinc-300">›</span>
      <div className="space-y-1">{squadra('Leoni', 2)}{squadra('Lupi', 3, true)}</div>
      <span className="text-zinc-300">›</span>
      <span className="text-3xl">🏆</span>
    </div>
  )
}

function Forma() {
  const righe: [string, string, '↑' | '↓' | '→'][] = [
    ['Marco R.', '7,8', '↑'],
    ['Luca B.', '7,1', '→'],
    ['Paolo T.', '6,4', '↓'],
  ]
  const colore = { '↑': 'text-green-600', '↓': 'text-red-500', '→': 'text-zinc-400' }
  return (
    <div className="space-y-1.5 rounded-2xl bg-zinc-50 p-3 dark:bg-zinc-900" aria-hidden>
      {righe.map(([nome, voto, f]) => (
        <div key={nome} className="flex items-center gap-2 text-sm">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold dark:bg-zinc-700">{nome[0]}</span>
          <span className="flex-1">{nome}</span>
          <span className="font-bold tabular-nums">{voto}</span>
          <span className={`w-4 text-center text-lg font-black ${colore[f]}`}>{f}</span>
        </div>
      ))}
    </div>
  )
}

function PodioKm() {
  const posti: [string, string, string, string][] = [
    ['🥈', 'Luca', '5,1', 'h-8 from-zinc-300 to-zinc-400'],
    ['🥇', 'Marco', '6,3', 'h-12 from-amber-300 to-amber-500'],
    ['🥉', 'Paolo', '4,7', 'h-5 from-orange-300 to-orange-500'],
  ]
  return (
    <div className="grid grid-cols-3 items-end gap-2 rounded-2xl bg-zinc-50 px-4 pt-3 dark:bg-zinc-900" aria-hidden>
      {posti.map(([medaglia, nome, km, barra]) => (
        <div key={nome} className="flex flex-col items-center gap-0.5 text-center">
          <span className="text-lg">{medaglia}</span>
          <span className="text-xs font-semibold">{nome}</span>
          <span className="text-sm font-extrabold tabular-nums">{km} km</span>
          <span className={`w-full rounded-t-lg bg-gradient-to-b ${barra}`} />
        </div>
      ))}
    </div>
  )
}

function Bilancia() {
  return (
    <div className="flex items-center justify-center gap-4 rounded-2xl bg-gradient-to-r from-green-600 to-green-700 p-3 text-white" aria-hidden>
      <div className="text-center">
        <p className="text-[10px] uppercase tracking-wide text-green-100">A</p>
        <p className="text-xl font-extrabold tabular-nums">7,2</p>
      </div>
      <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">≈</span>
      <div className="text-center">
        <p className="text-[10px] uppercase tracking-wide text-green-100">B</p>
        <p className="text-xl font-extrabold tabular-nums">7,1</p>
      </div>
    </div>
  )
}

// Gratis e Pro a confronto: si vede subito cosa c'è in più.
export function Confronto({ t }: { t: T }) {
  const righe: [string, boolean][] = [
    [t('Convocazioni, promemoria e lista d’attesa'), true],
    [t('Squadre automatiche dai voti, in campo'), true],
    [t('Risultati, gol, MVP e classifiche'), true],
    [t('I tuoi km di ogni partita da Apple Health, Health Connect o Strava'), true],
    [t('Tornei con gironi e tabellone'), false],
    [t('Forma dei giocatori a ogni partita'), false],
    [t('Squadre equilibrate anche sulla forma'), false],
    [t('Classifica km, record e km nel profilo'), false],
    [t('Voti aggiornati con le proposte automatiche'), false],
    [t('Marchio PRO accanto al tuo nome'), false],
  ]
  return (
    <Card className="overflow-hidden p-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th className="p-3 text-left font-semibold">{t('Cosa ottieni')}</th>
            <th className="w-16 p-3 text-center font-semibold text-zinc-500">{t('Gratis')}</th>
            <th className="w-16 bg-amber-50 p-3 text-center dark:bg-amber-950/40">
              <span className="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-zinc-900">PRO</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {righe.map(([voce, gratis]) => (
            <tr key={voce} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
              <td className={`p-3 ${gratis ? 'text-zinc-600 dark:text-zinc-300' : 'font-medium'}`}>{voce}</td>
              <td className="p-3 text-center">{gratis ? <span className="text-green-600">✓</span> : <span className="text-zinc-300 dark:text-zinc-600">—</span>}</td>
              <td className="bg-amber-50 p-3 text-center font-bold text-green-600 dark:bg-amber-950/40">✓</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

export function Garanzie({ t }: { t: T }) {
  const voci: [string, string][] = [
    ['🔒', t('Pagamento sicuro con Apple o Google')],
    ['🔓', t('Disdici quando vuoi dallo store')],
    ['👥', t('Gratis per tutti i tuoi giocatori')],
  ]
  return (
    <ul className="grid grid-cols-3 gap-2 text-center">
      {voci.map(([icona, testo]) => (
        <li key={testo} className="rounded-2xl bg-white/80 p-2 text-[11px] leading-tight text-zinc-600 dark:bg-zinc-900/80 dark:text-zinc-300">
          <span className="block text-xl">{icona}</span>
          {testo}
        </li>
      ))}
    </ul>
  )
}

// Le domande che si fa chi sta per abbonarsi.
export function Domande({ t }: { t: T }) {
  const faq: [string, string][] = [
    [t('Devono pagare anche i miei giocatori?'), t('No. Paghi solo tu, che organizzi: i giocatori della tua lega usano le funzioni Pro gratis.')],
    [t('Vale per tutte le mie leghe?'), t('Sì, fino a {n} leghe che organizzi: Pro è tuo e lo porti in ognuna. Gli altri organizzatori della lega non lo ricevono: serve il loro abbonamento. Gestisci più leghe, per esempio un centro sportivo? Scrivici per il piano Club.', { n: MAX_LEGHE_PRO })],
    [t('Come si disdice?'), t('Dalle impostazioni dell’App Store o di Google Play, quando vuoi. Pro resta attivo fino alla fine del periodo già pagato.')],
  ]
  return (
    <section className="space-y-2">
      <h2 className="text-center text-lg font-bold">{t('Domande frequenti')}</h2>
      {faq.map(([d, r]) => (
        <details key={d} className="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold">
            {d}
            <span className="text-zinc-400 transition group-open:rotate-45">＋</span>
          </summary>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{r}</p>
        </details>
      ))}
    </section>
  )
}

export function ChiusuraPro({ t }: { t: T }) {
  return (
    <>
      <div className="rounded-3xl bg-gradient-to-br from-green-700 to-emerald-900 p-6 text-center text-white">
        <p className="text-lg font-bold">{t('La tua lega merita il meglio.')}</p>
        <p className="mt-1 text-sm text-green-100">{t('Nessun vincolo: se non ti convince, lo disdici quando vuoi dallo store.')}</p>
        <a href="#prezzi" className="mt-4 inline-flex rounded-xl bg-amber-400 px-6 py-3 text-sm font-bold text-zinc-900 shadow-md transition active:scale-95">
          {t('Passa a Pro')} →
        </a>
      </div>
      <BarraPro testo={t('Passa a Pro')} sotto={t('Disdici quando vuoi · gratis per i giocatori')} />
    </>
  )
}
