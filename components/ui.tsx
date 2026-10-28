import Image from 'next/image'
import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'
import { PallinoAdmin } from './pallino-admin'
import { EtichettaPro, MarchioPro } from './logo-c'
import { BADGE, SKILLS, displayName, iniziali, overall, type Badge, type Player, type Skill } from '@/lib/roster'
import type { Risposta, Stato } from '@/lib/matches'
import { finestra } from '@/lib/finestra'
import { avatarUrl, immagineUrl } from '@/lib/image'
import { FotoZoom } from './foto-zoom'
import { PezzoBarra } from './pezzo-barra'
import { Medaglia } from './medaglia'
import { buttonClass, inputClass } from './ui-classes'
import { getT } from '@/lib/lingua'

export { buttonClass, inputClass }
export { Card, Field } from './ui-base'

export function PageTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <h1 className="text-xl font-bold">{children}</h1>
      {action}
    </div>
  )
}

export function ButtonLink({ variant = 'primary', ...props }: ComponentProps<typeof Link> & { variant?: 'primary' | 'secondary' }) {
  return <Link className={buttonClass(variant)} {...props} />
}

const RISPOSTA: Record<Risposta | 'nessuna', [string, string]> = {
  presente: ['In lista', 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'],
  assente: ['Assente', 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'],
  riserva: ['In attesa', 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'],
  nessuna: ['Non hai risposto', 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'],
}

const STATO: Record<Stato | 'non_ancora' | 'scaduta', [string, string]> = {
  non_ancora: ['Convocazioni non ancora aperte', 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'],
  scaduta: ['Tempo scaduto', 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'],
  aperta: ['Convocazioni aperte', 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'],
  chiusa: ['Convocazioni chiuse', 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'],
  giocata: ['Giocata', 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'],
  annullata: ['Annullata', 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'],
}

function Badge({ label, className }: { label: string; className: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>{label}</span>
}

export const RispostaBadge = async ({ risposta }: { risposta?: Risposta }) => {
  const t = await getT()
  const [label, cls] = RISPOSTA[risposta ?? 'nessuna'] ?? RISPOSTA.nessuna
  return <Badge label={t(label)} className={cls} />
}

// L'etichetta segue la finestra vera delle convocazioni, non solo lo stato salvato.
export const StatoBadge = async ({ match }: { match: { stato: Stato; aperturaConvocazioni: string; chiusuraConvocazioni: string } }) => {
  const t = await getT()
  const f = match.stato === 'aperta' ? finestra(match) : null
  const [label, cls] = STATO[f === 'non_ancora' || f === 'scaduta' ? f : match.stato] ?? STATO.aperta
  // non ancora aperte: quando si aprono (es. "Convocazioni dal 3 nov, 20:00")
  if (f === 'non_ancora') {
    const quando = t.data(match.aperturaConvocazioni, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    return <Badge label={t('Convocazioni dal {quando}', { quando })} className={cls} />
  }
  return <Badge label={t(label)} className={cls} />
}

// Colore del voto: da 8,5 viola, da 6,5 verde, da 5 giallo, da 2 rosso, sotto il 2 nero
// (sul voto arrotondato a un decimale, quello che si vede).
export function coloreVoto(voto: number) {
  const v = Math.round(voto * 10) / 10
  if (v >= 8.5) return 'bg-violet-600 text-white'
  if (v >= 6.5) return 'bg-green-600 text-white'
  if (v >= 5) return 'bg-yellow-400 text-zinc-900'
  if (v >= 2) return 'bg-red-600 text-white'
  return 'bg-black text-white ring-1 ring-white/30'
}

export function Overall({ player, grande = false }: { player: Player; grande?: boolean }) {
  const value = overall(player)
  const color = coloreVoto(value)
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-lg font-bold tabular-nums ${grande ? 'h-12 w-16 text-2xl' : 'h-8 w-9 text-sm'} ${color}`}>
      {value.toFixed(1)}
    </span>
  )
}

// Forma del giocatore (Pro, da −1 a +1): freccia accanto al voto, solo se si vede davvero.
export async function FrecciaForma({ forma }: { forma: number }) {
  if (Math.abs(forma) < 0.15) return null
  const t = await getT()
  const su = forma > 0
  const testo = t('Forma {segno}{valore}', { segno: su ? '+' : '−', valore: t.numero(Math.abs(forma), { maximumFractionDigits: 1 }) })
  return (
    <span title={testo} aria-label={testo} className={`shrink-0 text-sm font-bold ${su ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
      {su ? '↑' : '↓'}
    </span>
  )
}

// Foto profilo (o iniziali). Con `zoom` (di base sì) toccandola si apre ingrandita.
export function Avatar({ player, size = 40, zoom = true }: { player: Player; size?: number; zoom?: boolean }) {
  const url = avatarUrl(player.foto, size * 2)
  const initials = iniziali(displayName(player))
  const grande = zoom && url ? immagineUrl(player.foto, 1024) : null
  if (url && grande) return <FotoZoom piccola={url} grande={grande} nome={displayName(player)} size={size} />
  return url ? (
    <Image src={url} alt="" width={size} height={size} unoptimized className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-zinc-200 font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  )
}

const STILE_BADGE: Record<Badge, string> = {
  capitano: 'bg-sky-100 text-sky-800 ring-sky-300 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-800',
  legend: 'bg-amber-100 text-amber-800 ring-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-800',
  rookie: 'bg-green-100 text-green-800 ring-green-300 dark:bg-green-950 dark:text-green-300 dark:ring-green-800',
  asinus: 'bg-zinc-200 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700',
  promessa: 'bg-violet-100 text-violet-800 ring-violet-300 dark:bg-violet-950 dark:text-violet-300 dark:ring-violet-800',
}

// La fascia da capitano: banda gialla con la "A".
function FasciaCapitano() {
  return (
    <svg viewBox="0 0 24 16" className="h-3 w-[18px]" aria-hidden>
      <rect x="0.5" y="1.5" width="23" height="13" rx="3" fill="#facc15" stroke="#a16207" />
      <path d="M3 1.5v13M21 1.5v13" stroke="#a16207" strokeWidth="1" />
      <text x="12" y="12" textAnchor="middle" fontSize="10" fontWeight="900" fill="#1e3a8a" fontFamily="system-ui, sans-serif">
        A
      </text>
    </svg>
  )
}

// L'organizzatore della lega: la "C" del logo (con PRO accanto se è abbonato), toccandola si apre la spiegazione.
export async function IconaOrganizzatore({ pro = false }: { pro?: boolean }) {
  const t = await getT()
  return (
    <Medaglia
      emoji={<PallinoAdmin size={56} />}
      titolo={t('Organizzatore')}
      testo={t('Gestisce la lega: crea le partite, apre e chiude le convocazioni, fa le squadre, inserisce i risultati e invita i giocatori.')}
      className="shrink-0 rounded-md"
    >
      <span className="inline-flex items-center gap-0.5">
        <PallinoAdmin size={22} title={t('Organizzatore')} />
        {pro && <EtichettaPro />}
      </span>
    </Medaglia>
  )
}

// Il badge del giocatore: toccandolo si apre la spiegazione.
export async function PlayerBadge({ badge }: { badge?: Badge }) {
  if (!badge || !BADGE[badge]) return null
  const t = await getT()
  const simbolo = badge === 'capitano' ? <FasciaCapitano /> : BADGE[badge].emoji
  return (
    <Medaglia
      emoji={badge === 'capitano' ? <span className="inline-block scale-[2.5] py-3"><FasciaCapitano /></span> : simbolo}
      titolo={t(BADGE[badge].label)}
      testo={t(BADGE[badge].descrizione)}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ring-1 ${STILE_BADGE[badge]}`}
    >
      {simbolo} {t(BADGE[badge].label)}
    </Medaglia>
  )
}

// mostraAccesso: nella rosa segnala chi non ha ancora fatto l'accesso all'app.
// `prima`: accanto al voto, a sinistra (es. gol e MVP), così i voti restano allineati a destra.
export async function PlayerRow({
  player,
  prima,
  right,
  mostraAccesso = false,
  mio = false,
  forma,
  organizzatore = false,
}: {
  player: Player
  prima?: ReactNode
  right?: ReactNode
  mostraAccesso?: boolean
  /** La mia riga: nome in grassetto e sfondo evidenziato. */
  mio?: boolean
  /** Pro: forma del giocatore, freccia accanto al voto. */
  forma?: number
  /** Mostra la C dell'organizzatore (nella rosa). */
  organizzatore?: boolean
}) {
  const t = await getT()
  return (
    <div className={`flex items-center gap-3 ${mio ? '-mx-1.5 rounded-lg bg-green-50 px-1.5 py-1 dark:bg-green-950/50' : ''}`}>
      <Avatar player={player} />
      <Link href={`/giocatori/${player._id}`} className="min-w-0 flex-1 hover:underline">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className={`truncate ${mio ? 'font-extrabold' : 'font-medium'}`}>{displayName(player)}</span>
          <PlayerBadge badge={player.badge} />
        </div>
        {(player.ruolo || (mostraAccesso && player.collegato === false)) && (
          <div className="text-xs text-zinc-500">
            {player.ruolo && <span className="capitalize">{t(player.ruolo)}</span>}
            {player.ruolo && mostraAccesso && player.collegato === false && ' · '}
            {mostraAccesso && player.collegato === false && <span className="text-amber-700 dark:text-amber-400">⏳ {t('non ha ancora fatto l\u2019accesso')}</span>}
          </div>
        )}
      </Link>
      {/* a destra, prima del voto: la C dell'organizzatore (con PRO se è abbonato), o C PRO per gli abbonati */}
      {organizzatore ? <IconaOrganizzatore pro={!!player.pro} /> : player.pro && <MarchioPro />}
      {prima}
      {forma != null && <FrecciaForma forma={forma} />}
      <Overall player={player} />
      {right}
    </div>
  )
}

// Le caratteristiche a barre. Pro: rispetto ai voti di partenza, la parte guadagnata è viola trasparente
// e quella persa rosso trasparente; toccandole si vede di quanto.
export async function SkillBars({ player }: { player: Player }) {
  const t = await getT()
  const voci = (Object.entries(SKILLS) as [Skill, string][]).map(([key, label]) => {
    const value = player.caratteristiche?.[key] ?? 0
    const base = player.caratteristicheBase?.[key] ?? value
    return { key, label, value, base, diff: Math.round((value - base) * 100) / 100 }
  })
  const su = voci.some((v) => v.diff > 0)
  const giu = voci.some((v) => v.diff < 0)
  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {voci.map(({ key, label, value, base, diff }) => (
          <li key={key} className="grid grid-cols-[6rem_1fr_2.5rem] items-center gap-2 text-sm">
            <span>{t(label)}</span>
            <span className="flex h-2 rounded bg-zinc-200 dark:bg-zinc-800">
              <span className={`block h-2 bg-green-600 ${diff ? 'rounded-l' : 'rounded'}`} style={{ width: `${Math.min(value, base) * 10}%` }} />
              {diff !== 0 && (
                <PezzoBarra
                  larghezza={Math.abs(diff) * 10}
                  su={diff > 0}
                  testo={t(diff > 0 ? '+{diff} (da {base})' : '−{diff} (da {base})', { diff: t.numero(Math.abs(diff)), base: t.numero(base) })}
                />
              )}
            </span>
            <span className="text-right tabular-nums">{t.numero(value)}</span>
          </li>
        ))}
      </ul>
      {(su || giu) && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
          {su && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-4 rounded bg-violet-500/45" />
              {t('Migliorato')}
            </span>
          )}
          {giu && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-4 rounded bg-red-500/35" />
              {t('Peggiorato')}
            </span>
          )}
          <span>{t('rispetto ai voti di partenza (Pro): tocca la parte colorata per vedere di quanto')}</span>
        </p>
      )}
    </div>
  )
}

export async function Loading() {
  const t = await getT()
  return <p className="animate-pulse text-sm text-zinc-500">{t('Caricamento…')}</p>
}
