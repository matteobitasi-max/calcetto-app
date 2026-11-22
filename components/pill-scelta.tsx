import Link from 'next/link'
import { barraClass, pillClass } from './sezioni'

// Una pillola divisa in segmenti (come il menu in alto) per scegliere la vista di una pagina.
export function PillScelta({ voci }: { voci: { href: string; label: string; attiva: boolean }[] }) {
  return (
    <nav className={barraClass}>
      {voci.map((v) => (
        <Link key={v.href} href={v.href} replace scroll={false} className={pillClass(v.attiva)} aria-current={v.attiva ? 'page' : undefined}>
          {v.label}
        </Link>
      ))}
    </nav>
  )
}

// Etichetta del Club: la pillola nera CLUB con dentro quella PRO (il Club include tutto il Pro).
// Le funzioni del Club si vedono anche senza Club, con questa etichetta, ma non si possono usare.
export function EtichettaClub() {
  return (
    <span title="Club Allenatore · Pro incluso" className="inline-flex shrink-0 items-center gap-1 rounded-full bg-zinc-900 py-0.5 pl-2 pr-0.5 text-[10px] font-bold leading-[14px] text-white dark:bg-white dark:text-zinc-900">
      CLUB
      <span className="rounded-full bg-amber-400 px-1.5 text-[9px] font-extrabold text-zinc-900">PRO</span>
    </span>
  )
}
