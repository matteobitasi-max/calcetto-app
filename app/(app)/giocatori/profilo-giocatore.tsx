import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SignOutButton } from '@clerk/nextjs'
import { displayName, eta, membroDi } from '@/lib/player'
import { getKmTotali, getPartitePunteggio, getPlayer, getPlayerStats, getStorico, type PartitaGiocata, type PlayerStats } from '@/lib/matches'
import { classifica } from '@/lib/punteggio'
import { TROFEI, trofeiLega, type IdTrofeo } from '@/lib/trofei'
import { Medaglia } from '@/components/medaglia'
import { SaluteAccount } from '@/components/salute-account'
import { getT } from '@/lib/lingua'
import type { T } from '@/lib/i18n'
import { ScegliLingua } from '@/components/scegli-lingua'
import { immagineUrl } from '@/lib/image'
import { caricaFoto } from '@/app/actions'
import { AvatarUpload } from '@/components/avatar-upload'
import { NotificheToggle } from '@/components/notifiche-toggle'
import { PreferenzeNotifiche } from '@/components/preferenze-notifiche'
import { Avatar, Card, Overall, PlayerBadge, SkillBars, buttonClass } from '@/components/ui'

// Il profilo di un giocatore: usato sia per /giocatori/[id] sia per il mio /profilo.
export async function ProfiloGiocatore({ id }: { id: string }) {
  const player = await getPlayer(id)
  // Le schede si vedono solo tra membri della stessa lega.
  const me = await membroDi(player?.legaId)
  if (!player || !me) notFound()
  const [stats, storico, partite, kmTotali, trofeiTutti, t] = await Promise.all([
    getPlayerStats(id, me.lega._id),
    getStorico(id),
    getPartitePunteggio(me.lega._id),
    getKmTotali(me.lega._id),
    trofeiLega(me.lega._id),
    getT(),
  ])
  const trofei = trofeiTutti.get(id) ?? {}
  const inClassifica = classifica(partite).find((r) => r.id === player._id)

  const fullName = [player.nome, player.cognome].filter(Boolean).join(' ')
  // Modifica e unione dei doppioni: solo per gli organizzatori. La foto: anche ognuno la sua.
  const canEdit = !!me.isAdmin
  const mio = me._id === player._id
  const cambiaFoto = canEdit || mio
  const ruoli = [
    player.isAdmin && t('organizzatore'),
    !player.isAdmin && player.puoInserireRisultati && t('refertatore'),
  ]

  return (
    <div className="space-y-4">
      {mio && <p className="text-sm font-medium text-green-700 dark:text-green-400">{t('Il mio profilo')}</p>}
      <Card className="relative">
        {canEdit && (
          <Link
            href={`/giocatori/${player._id}/modifica`}
            aria-label={t('Modifica giocatore')}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            ✏️
          </Link>
        )}
        <div className="flex items-center gap-4 pr-8">
          {cambiaFoto ? (
            <AvatarUpload action={caricaFoto.bind(null, player._id)} size={72} grande={immagineUrl(player.foto, 1024)} nome={displayName(player)}>
              <Avatar player={player} size={72} zoom={false} />
            </AvatarUpload>
          ) : (
            <Avatar player={player} size={72} />
          )}
          <div className="min-w-0 flex-1 space-y-1">
            <h1 className="break-words text-xl font-bold leading-tight">{displayName(player)}</h1>
            {player.soprannome && <p className="text-sm text-zinc-500">{fullName}</p>}
            <PlayerBadge badge={player.badge} />
            <p className="text-sm leading-snug text-zinc-500 first-letter:uppercase">
              {[player.ruolo && t(player.ruolo), player.piede && t('piede {piede}', { piede: t(player.piede) }), player.dataNascita && t('{n} anni', { n: eta(player.dataNascita) }), ...ruoli, player.attivo === false && t('non attivo')]
                .filter(Boolean)
                .join(' · ')}
            </p>
            {player.collegato === false && <p className="text-xs text-amber-700 dark:text-amber-400">⏳ {t('non ha ancora fatto l’accesso')}</p>}
          </div>
          <div className="flex shrink-0 flex-col items-center gap-1 pt-6">
            <Overall player={player} grande />
            {inClassifica ? (
              <p className="text-center text-xs leading-tight text-zinc-500">
                <b className="text-zinc-700 dark:text-zinc-200">{t('{n}°', { n: inClassifica.posizione })}</b> {t('in classifica')}
                <br />
                {t.numero(inClassifica.punti, { maximumFractionDigits: 2 })} {t('pt')}
              </p>
            ) : (
              <p className="text-xs text-zinc-400">{t('voto')}</p>
            )}
          </div>
        </div>
        {me.isAdmin && (
          <Link href={`/giocatori/${player._id}/unisci`} className="mt-3 block text-right text-xs text-zinc-500 hover:underline">
            🔗 {t('Unisci un doppione')}
          </Link>
        )}
      </Card>

      <Statistiche stats={stats} km={kmTotali.get(id)} t={t} />

      <Card>
        <h2 className="mb-1 font-semibold">🏅 {t('Trofei')}</h2>
        <p className="mb-3 text-xs text-zinc-500">
          {t('{n} su {tot} sbloccati · tocca un trofeo per sapere cos’è', { n: Object.keys(trofei).length, tot: Object.keys(TROFEI).length })}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(TROFEI) as IdTrofeo[]).map((tr) => (
            <Trofeo key={tr} id={tr} sbloccato={trofei[tr]} t={t} />
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">{t('Caratteristiche')}</h2>
        <SkillBars player={player} />
      </Card>

      <Storico partite={storico} mio={mio} t={t} />

      {mio && (
        <div className="space-y-3">
          <Card className="space-y-3">
            <h2 className="font-semibold">🔔 {t('Notifiche')}</h2>
            <NotificheToggle variant="impostazione" />
            <div>
              <p className="text-xs text-zinc-500">{t('Cosa vuoi ricevere da {lega}:', { lega: me.lega.nome })}</p>
              <PreferenzeNotifiche iniziali={player.notifiche} />
            </div>
          </Card>
          {/* Solo nell'app: Apple Health (iPhone) / Health Connect (Android) per i km */}
          <Card className="p-0! empty:hidden">
            <SaluteAccount />
          </Card>
          <Card className="space-y-3">
            <h2 className="font-semibold">🌍 {t('Lingua')}</h2>
            <ScegliLingua />
          </Card>
          <Card className="divide-y divide-zinc-100 p-0! text-sm dark:divide-zinc-800">
            <Link href="/account" className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800">
              👤 {t('Il mio account (nome, telefono, nascita, ruolo, piede)')} <span className="text-zinc-400">›</span>
            </Link>
            <Link href="/privacy" className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800">
              🔒 {t('Privacy policy')} <span className="text-zinc-400">›</span>
            </Link>
            <Link href="/supporto" className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800">
              💬 {t('Supporto')} <span className="text-zinc-400">›</span>
            </Link>
          </Card>
          <SignOutButton redirectUrl="/sign-in">
            <button className={`${buttonClass('secondary')} w-full`}>{t('Esci')}</button>
          </SignOutButton>
        </div>
      )}
    </div>
  )
}

function Statistiche({ stats: s, km, t }: { stats: PlayerStats; km?: { km: number; partite: number }; t: T }) {
  if (s.giocate === 0) {
    return <Card className="text-sm text-zinc-500">{t('Le statistiche compariranno dopo la prima partita con il risultato.')}</Card>
  }
  const pct = (n: number) => Math.round((n / s.giocate) * 100)
  const media = (n: number) => t.numero(n / s.giocate, { minimumFractionDigits: 1, maximumFractionDigits: 1 })

  return (
    <Card className="space-y-4">
      <h2 className="font-semibold">{t('Statistiche')}</h2>
      <dl className="grid grid-cols-4 gap-2 text-center">
        {(
          [
            [t('Partite'), s.giocate, ''],
            [t('Vittorie'), `${pct(s.vinte)}%`, 'text-green-600'],
            [t('Gol'), s.gol, ''],
            ['MVP 🫑', s.mvp, 'text-amber-500'],
          ] as const
        ).map(([label, value, cls]) => (
          <div key={label} className="flex flex-col-reverse rounded-lg bg-zinc-50 py-2 dark:bg-zinc-950">
            <dt className="text-xs text-zinc-500">{label}</dt>
            <dd className={`text-2xl font-bold tabular-nums ${cls}`}>{value}</dd>
          </div>
        ))}
      </dl>

      <div className="space-y-1">
        <div className="flex h-3 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800" aria-hidden>
          <span className="bg-green-600" style={{ width: `${pct(s.vinte)}%` }} />
          <span className="bg-zinc-400" style={{ width: `${pct(s.pari)}%` }} />
          <span className="bg-red-500" style={{ width: `${pct(s.perse)}%` }} />
        </div>
        <p className="flex justify-between text-xs text-zinc-500">
          <span className="text-green-700 dark:text-green-400">{t('{n} vinte', { n: s.vinte })}</span>
          <span>{t('{n} pari', { n: s.pari })}</span>
          <span className="text-red-600">{t('{n} perse', { n: s.perse })}</span>
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
        {(
          [
            [t('Gol fatti'), s.gol],
            [t('Gol a partita'), media(s.gol)],
            [t('Gol subiti'), s.gs],
            [t('Subiti a partita'), media(s.gs)],
            // km solo se ce ne sono (da Apple Salute): la media è sulle partite con i km
            ...(km
              ? ([
                  [`🏃 ${t('Km totali')}`, t.numero(km.km, { maximumFractionDigits: 1 })],
                  [t('Km a partita'), t.numero(km.km / km.partite, { maximumFractionDigits: 1 })],
                ] as const)
              : []),
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="flex justify-between gap-2 border-b border-zinc-100 pb-1 dark:border-zinc-800">
            <dt className="text-zinc-500">{label}</dt>
            <dd className="font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}

const ESITO = {
  V: 'bg-green-600 text-white',
  P: 'bg-zinc-400 text-white',
  S: 'bg-red-500 text-white',
}
const LETTERA = { V: 'V|vittorie', P: 'P|pari', S: 'S|sconfitte' } as const

// mio: nel mio profilo i gol della mia squadra sono in grassetto quando ho vinto.
function Storico({ partite, mio, t }: { partite: PartitaGiocata[]; mio: boolean; t: T }) {
  if (partite.length === 0) return null
  return (
    <Card>
      <h2 className="mb-3 flex items-center justify-between font-semibold">
        {t('Ultime partite')}
        <span className="flex gap-1">
          {[...partite].reverse().map((p) => {
            const e = p.fatti > p.subiti ? 'V' : p.fatti < p.subiti ? 'S' : 'P'
            return (
              <span key={p._id} className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${ESITO[e]}`}>
                {t(LETTERA[e])}
              </span>
            )
          })}
        </span>
      </h2>
      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {partite.map((p) => {
          const e = p.fatti > p.subiti ? 'V' : p.fatti < p.subiti ? 'S' : 'P'
          return (
            <li key={p._id}>
              <Link href={`/partite/${p._id}`} className="flex items-center gap-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold ${ESITO[e]}`}>{t(LETTERA[e])}</span>
                <span className="min-w-0 flex-1">
                  <span className="block capitalize">{t.data(p.data, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                  <span className="block truncate text-xs text-zinc-500">{p.luogo}</span>
                </span>
                <span className="text-right">
                  <span className="block tabular-nums text-zinc-600 dark:text-zinc-300">
                    <span className={mio && p.fatti > p.subiti ? 'font-bold text-zinc-900 dark:text-white' : ''}>{p.fatti}</span>
                    {' – '}
                    {p.subiti}
                  </span>
                  <span className="block text-xs">
                    {p.gol > 0 && `⚽${p.gol > 1 ? `×${p.gol}` : ''}`}
                    {p.mvp && ' 🫑'}
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

// Un trofeo: sbloccato a colori (con quante volte), da sbloccare in grigio. Toccandolo si apre la spiegazione.
function Trofeo({ id, sbloccato, t }: { id: IdTrofeo; sbloccato?: { il: string; volte: number }; t: T }) {
  const tr = TROFEI[id]
  const dettaglio = sbloccato
    ? t('Sbloccato il {data}', { data: t.data(sbloccato.il, { day: 'numeric', month: 'long', year: 'numeric' }) }) +
      (sbloccato.volte > 1 ? ` · ${t('{n} volte', { n: sbloccato.volte })}` : '')
    : `🔒 ${t('Ancora da sbloccare')}`
  return (
    <Medaglia
      emoji={tr.emoji}
      titolo={t(tr.nome)}
      testo={t(tr.descrizione)}
      dettaglio={dettaglio}
      // tutti i riquadri della stessa misura, anche con nomi su due righe o senza "×N"
      className={`flex h-28 w-full flex-col items-center justify-center gap-1 rounded-xl p-2 text-center ${
        sbloccato ? 'bg-amber-50 ring-1 ring-amber-300 dark:bg-amber-950/40 dark:ring-amber-700' : 'bg-zinc-50 opacity-50 grayscale dark:bg-zinc-950'
      }`}
    >
      <span className="text-3xl">{tr.emoji}</span>
      <span className="flex h-8 items-center text-xs font-semibold leading-tight">{t(tr.nome)}</span>
      <span className={`text-[11px] text-zinc-500 ${sbloccato && sbloccato.volte > 1 ? '' : 'invisible'}`}>×{sbloccato?.volte ?? 1}</span>
    </Medaglia>
  )
}
