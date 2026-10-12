import Image from 'next/image'
import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'
import { SKILLS, displayName, overall, type Player, type Skill } from '@/lib/roster'
import type { Risposta, Stato } from '@/lib/matches'
import { avatarUrl } from '@/lib/image'
import { buttonClass, inputClass } from './ui-classes'

export { buttonClass, inputClass }

export function Card({ className = '', ...props }: ComponentProps<'section'>) {
  return <section className={`rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 ${className}`} {...props} />
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

const STATO: Record<Stato, [string, string]> = {
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

export const StatoBadge = ({ stato }: { stato: Stato }) => {
  const [label, cls] = STATO[stato] ?? STATO.aperta
  return <Badge label={label} className={cls} />
}

export function Overall({ player }: { player: Player }) {
  const value = overall(player)
  const color = value >= 7.5 ? 'bg-green-600' : value >= 5.5 ? 'bg-amber-500' : 'bg-zinc-500'
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-lg font-bold tabular-nums text-white h-8 w-9 text-sm ${color}`}>
      {value.toFixed(1)}
    </span>
  )
}

export function Avatar({ player, size = 40 }: { player: Player; size?: number }) {
  const url = avatarUrl(player.foto, size * 2)
  const initials = displayName(player)
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
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

export function PlayerRow({ player, right }: { player: Player; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar player={player} />
      <Link href={`/giocatori/${player._id}`} className="min-w-0 flex-1 hover:underline">
        <div className="truncate font-medium">{displayName(player)}</div>
        {player.ruolo && <div className="text-xs capitalize text-zinc-500">{player.ruolo}</div>}
      </Link>
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
