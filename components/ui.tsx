import Image from 'next/image'
import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'
import { BADGE, SKILLS, displayName, iniziali, overall, type Badge, type Player, type Skill } from '@/lib/roster'
import type { Risposta, Stato } from '@/lib/matches'
import { finestra } from '@/lib/finestra'
import { avatarUrl, immagineUrl } from '@/lib/image'
import { FotoZoom } from './foto-zoom'
import { Medaglia } from './medaglia'
import { buttonClass, inputClass } from './ui-classes'

export { buttonClass, inputClass }

export function Card({ className = '', ...props }: ComponentProps<'section'>) {
  return <section className={`rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-lg dark:shadow-black/40 ${className}`} {...props} />
}

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

// group: per controlli composti (es. il calendario) che non possono stare dentro un <label>.
export function Field({ label, children, group = false }: { label: string; children: ReactNode; group?: boolean }) {
  const Tag = group ? 'div' : 'label'
  return (
    <Tag className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </Tag>
  )
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

export const RispostaBadge = ({ risposta }: { risposta?: Risposta }) => {
  const [label, cls] = RISPOSTA[risposta ?? 'nessuna'] ?? RISPOSTA.nessuna
  return <Badge label={label} className={cls} />
}

// L'etichetta segue la finestra vera delle convocazioni, non solo lo stato salvato.
export const StatoBadge = ({ match }: { match: { stato: Stato; aperturaConvocazioni: string; chiusuraConvocazioni: string } }) => {
  const f = match.stato === 'aperta' ? finestra(match) : null
  const [label, cls] = STATO[f === 'non_ancora' || f === 'scaduta' ? f : match.stato] ?? STATO.aperta
  return <Badge label={label} className={cls} />
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

// La fascia da capitano: banda gialla con la "C".
function FasciaCapitano() {
  return (
    <svg viewBox="0 0 24 16" className="h-3 w-[18px]" aria-hidden>
      <rect x="0.5" y="1.5" width="23" height="13" rx="3" fill="#facc15" stroke="#a16207" />
      <path d="M3 1.5v13M21 1.5v13" stroke="#a16207" strokeWidth="1" />
      <text x="12" y="12" textAnchor="middle" fontSize="10" fontWeight="900" fill="#1e3a8a" fontFamily="system-ui, sans-serif">
        C
      </text>
    </svg>
  )
}

// La "C" dell'organizzatore, come nel logo dell'app: C bianca bordata di verde su campo a strisce.
function LogoC({ size = 22 }: { size?: number }) {
  const c = 'M8.2 5.5h7.6l2.7 2.7v2.4h-4.2V9.3h-3.6v5.4h3.6v-1.3h4.2v2.4l-2.7 2.7H8.2l-2.7-2.7V8.2z'
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden className="shrink-0 drop-shadow-sm">
      <defs>
        <clipPath id="logo-c-angoli">
          <rect x="0.5" y="0.5" width="23" height="23" rx="5.5" />
        </clipPath>
      </defs>
      {/* campo a strisce con gli angoli arrotondati */}
      <g clipPath="url(#logo-c-angoli)">
        <rect width="24" height="24" fill="#2a9d46" />
        <path d="M4 0h4v24H4zM12 0h4v24h-4zM20 0h4v24h-4z" fill="#1f8a3c" />
      </g>
      {/* bordo: verde scuro fuori, filo chiaro dentro */}
      <rect x="0.5" y="0.5" width="23" height="23" rx="5.5" fill="none" stroke="#14532d" strokeWidth="1" />
      <rect x="1.5" y="1.5" width="21" height="21" rx="4.5" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="0.75" />
      {/* la C come una lettera da maglia: contorno bianco, poi verde, poi il pieno bianco */}
      <path d={c} fill="none" stroke="#ffffff" strokeWidth="2.6" strokeLinejoin="round" />
      <path d={c} fill="#ffffff" stroke="#166534" strokeWidth="1.1" strokeLinejoin="round" />
    </svg>
  )
}

// L'organizzatore della lega: la "C" del logo, toccandola si apre la spiegazione.
export function IconaOrganizzatore() {
  return (
    <Medaglia
      emoji={<span className="inline-block scale-[2.5] py-4"><LogoC /></span>}
      titolo="Organizzatore"
      testo="Gestisce la lega: crea le partite, apre e chiude le convocazioni, fa le squadre, inserisce i risultati e invita i giocatori."
      className="shrink-0 rounded-md"
    >
      <LogoC />
    </Medaglia>
  )
}

// Il badge del giocatore: toccandolo si apre la spiegazione.
export function PlayerBadge({ badge }: { badge?: Badge }) {
  if (!badge || !BADGE[badge]) return null
  const simbolo = badge === 'capitano' ? <FasciaCapitano /> : BADGE[badge].emoji
  return (
    <Medaglia
      emoji={badge === 'capitano' ? <span className="inline-block scale-[2.5] py-3"><FasciaCapitano /></span> : simbolo}
      titolo={BADGE[badge].label}
      testo={BADGE[badge].descrizione}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ring-1 ${STILE_BADGE[badge]}`}
    >
      {simbolo} {BADGE[badge].label}
    </Medaglia>
  )
}

// mostraAccesso: nella rosa segnala chi non ha ancora fatto l'accesso all'app.
// `prima`: accanto al voto, a sinistra (es. gol e MVP), così i voti restano allineati a destra.
export function PlayerRow({
  player,
  prima,
  right,
  mostraAccesso = false,
  mio = false,
}: {
  player: Player
  prima?: ReactNode
  right?: ReactNode
  mostraAccesso?: boolean
  /** La mia riga: nome in grassetto e sfondo evidenziato. */
  mio?: boolean
}) {
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
            {player.ruolo && <span className="capitalize">{player.ruolo}</span>}
            {player.ruolo && mostraAccesso && player.collegato === false && ' · '}
            {mostraAccesso && player.collegato === false && <span className="text-amber-700 dark:text-amber-400">⏳ non ha ancora fatto l&apos;accesso</span>}
          </div>
        )}
      </Link>
      {prima}
      <Overall player={player} />
      {right}
    </div>
  )
}

export function SkillBars({ player }: { player: Player }) {
  return (
    <ul className="space-y-2">
      {(Object.entries(SKILLS) as [Skill, string][]).map(([key, label]) => {
        const value = player.caratteristiche?.[key] ?? 0
        return (
          <li key={key} className="grid grid-cols-[6rem_1fr_2rem] items-center gap-2 text-sm">
            <span>{label}</span>
            <span className="h-2 rounded bg-zinc-200 dark:bg-zinc-800">
              <span className="block h-2 rounded bg-green-600" style={{ width: `${value * 10}%` }} />
            </span>
            <span className="text-right tabular-nums">{value}</span>
          </li>
        )
      })}
    </ul>
  )
}

export function Loading() {
  return <p className="animate-pulse text-sm text-zinc-500">Caricamento…</p>
}
